package controller

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"sync"

	"pentagi/pkg/config"
	"pentagi/pkg/database"
	"pentagi/pkg/graph/subscriptions"
	"pentagi/pkg/providers"
	"pentagi/pkg/providers/provider"

	"github.com/sirupsen/logrus"
)

// DomainController owns domain-level orchestration: it enforces the
// concurrent-domain quota, spawns one child flow per selected template (capped
// by the flows-per-domain guardrail), and tracks in-flight orchestrations. It
// parallels flowController and is wired the same way.
type DomainController interface {
	CreateDomain(ctx context.Context, params CreateDomainParams) (*DomainResult, error)
	DeleteDomain(ctx context.Context, userID, domainID int64) error
	CountActiveDomainsForUser(ctx context.Context, userID int64) (int64, error)
	RegisterDomain(domainID int64)
	UnregisterDomain(domainID int64)
}

// CreateDomainParams carries everything needed to orchestrate a domain scan.
type CreateDomainParams struct {
	UserID       int64
	Name         string
	TargetType   string  // used when AutoDetect is false
	TemplateIDs  []int64 // manual selection; may be empty when AutoDetect is true
	AutoDetect   bool
	ProviderName provider.ProviderName
	ProviderType provider.ProviderType
}

// DomainResult reports the orchestration outcome so the caller can surface a
// truncation warning to the user.
type DomainResult struct {
	Domain    database.Domain
	Flows     []database.Flow
	Requested int  // templates the orchestrator attempted to spawn
	Spawned   int  // flows actually created
	Truncated bool // true when a quota truncated the fan-out
}

type domainController struct {
	db         database.Querier
	mx         *sync.Mutex
	cfg        *config.Config
	fc         FlowController
	provs      providers.ProviderController
	subs       subscriptions.SubscriptionsController
	classifier *domainClassifier
	active     map[int64]struct{}
}

func NewDomainController(
	db database.Querier,
	cfg *config.Config,
	fc FlowController,
	provs providers.ProviderController,
	subs subscriptions.SubscriptionsController,
) DomainController {
	return &domainController{
		db:         db,
		mx:         &sync.Mutex{},
		cfg:        cfg,
		fc:         fc,
		provs:      provs,
		subs:       subs,
		classifier: newDomainClassifier(cfg, provs),
		active:     make(map[int64]struct{}),
	}
}

func (dc *domainController) CountActiveDomainsForUser(ctx context.Context, userID int64) (int64, error) {
	return dc.db.CountActiveDomainsForUser(ctx, userID)
}

func (dc *domainController) RegisterDomain(domainID int64) {
	dc.mx.Lock()
	defer dc.mx.Unlock()
	dc.active[domainID] = struct{}{}
}

func (dc *domainController) UnregisterDomain(domainID int64) {
	dc.mx.Lock()
	defer dc.mx.Unlock()
	delete(dc.active, domainID)
}

func (dc *domainController) CreateDomain(ctx context.Context, params CreateDomainParams) (*DomainResult, error) {
	logger := logrus.WithContext(ctx).WithFields(logrus.Fields{
		"user_id": params.UserID,
		"name":    params.Name,
	})

	count, err := dc.db.CountActiveDomainsForUser(ctx, params.UserID)
	if err != nil {
		return nil, fmt.Errorf("failed to count active domains for user %d: %w", params.UserID, err)
	}
	if int(count) >= dc.cfg.MaxConcurrentDomainsPerUser {
		logger.WithFields(logrus.Fields{
			"active": count,
			"limit":  dc.cfg.MaxConcurrentDomainsPerUser,
		}).Warn("domain creation rejected: per-user concurrent-domain quota exceeded")
		return nil, &QuotaError{Quota: QuotaDomains, Current: int(count), Max: dc.cfg.MaxConcurrentDomainsPerUser}
	}

	targetType := params.TargetType
	if targetType == "" {
		targetType = defaultTargetType
	}
	initialStatus := database.DomainStatusCreated
	if params.AutoDetect {
		initialStatus = database.DomainStatusClassifying
	}

	domain, err := dc.db.CreateDomain(ctx, database.CreateDomainParams{
		UserID:            params.UserID,
		Name:              params.Name,
		TargetType:        targetType,
		Status:            initialStatus,
		DetectionMetadata: json.RawMessage("{}"),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create domain: %w", err)
	}

	dc.RegisterDomain(domain.ID)
	defer dc.UnregisterDomain(domain.ID)
	dc.publishDomain(ctx, params.UserID, domain, true)

	templateIDs := params.TemplateIDs
	if params.AutoDetect {
		detected, metadata := dc.classifier.Classify(ctx, params.UserID, params.Name, params.ProviderName)
		domain, err = dc.db.UpdateDomainDetectionMetadata(ctx, database.UpdateDomainDetectionMetadataParams{
			ID:                domain.ID,
			TargetType:        detected,
			DetectionMetadata: metadata,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to store detection metadata for domain %d: %w", domain.ID, err)
		}
		dc.publishDomain(ctx, params.UserID, domain, false)

		if len(templateIDs) == 0 {
			defaults, err := dc.db.GetDefaultFlowTemplatesByTargetType(ctx, database.GetDefaultFlowTemplatesByTargetTypeParams{
				UserID:  params.UserID,
				Column2: detected,
			})
			if err != nil {
				return nil, fmt.Errorf("failed to load default templates for target type %s: %w", detected, err)
			}
			for _, template := range defaults {
				templateIDs = append(templateIDs, template.ID)
			}
		}
	}

	requested := len(templateIDs)
	truncated := false
	if requested > dc.cfg.MaxFlowsPerDomain {
		templateIDs = templateIDs[:dc.cfg.MaxFlowsPerDomain]
		truncated = true
		logger.WithFields(logrus.Fields{
			"requested": requested,
			"cap":       dc.cfg.MaxFlowsPerDomain,
		}).Warn("domain fan-out truncated to flows-per-domain cap")
	}

	spawned := 0
	for _, templateID := range templateIDs {
		_, err := dc.fc.CreateFlowForDomain(ctx, params.UserID, domain.ID, templateID, params.ProviderName, params.ProviderType)
		if err != nil {
			var quotaErr *QuotaError
			if errors.As(err, &quotaErr) {
				truncated = true
				logger.WithField("spawned", spawned).Warn("domain fan-out truncated by per-user flow quota")
				break
			}
			logger.WithError(err).WithField("template_id", templateID).Error("failed to spawn child flow for domain")
			continue
		}
		spawned++
	}

	finalStatus := database.DomainStatusRunning
	if spawned == 0 {
		finalStatus = database.DomainStatusFailed
	}
	domain, err = dc.db.UpdateDomainStatus(ctx, database.UpdateDomainStatusParams{
		ID:     domain.ID,
		Status: finalStatus,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to update domain %d status: %w", domain.ID, err)
	}

	flows, err := dc.db.GetFlowsForDomain(ctx, sql.NullInt64{Int64: domain.ID, Valid: true})
	if err != nil {
		return nil, fmt.Errorf("failed to get flows for domain %d: %w", domain.ID, err)
	}

	dc.publishDomain(ctx, params.UserID, domain, false)

	return &DomainResult{
		Domain:    domain,
		Flows:     flows,
		Requested: requested,
		Spawned:   spawned,
		Truncated: truncated,
	}, nil
}

func (dc *domainController) DeleteDomain(ctx context.Context, userID, domainID int64) error {
	flows, err := dc.db.GetFlowsForDomain(ctx, sql.NullInt64{Int64: domainID, Valid: true})
	if err != nil {
		return fmt.Errorf("failed to get flows for domain %d: %w", domainID, err)
	}

	for _, flow := range flows {
		switch flow.Status {
		case database.FlowStatusCreated, database.FlowStatusRunning, database.FlowStatusWaiting:
			if err := dc.fc.StopFlow(ctx, flow.ID); err != nil && !errors.Is(err, ErrFlowNotFound) {
				logrus.WithContext(ctx).WithError(err).WithField("flow_id", flow.ID).
					Warn("failed to stop child flow during domain delete")
			}
		}
	}

	domain, err := dc.db.DeleteDomain(ctx, domainID)
	if err != nil {
		return fmt.Errorf("failed to delete domain %d: %w", domainID, err)
	}

	dc.UnregisterDomain(domainID)

	flows, err = dc.db.GetFlowsForDomain(ctx, sql.NullInt64{Int64: domainID, Valid: true})
	if err != nil {
		flows = nil
	}
	dc.subs.NewFlowPublisher(userID, domain.ID).DomainDeleted(ctx, domain, flows)

	return nil
}

func (dc *domainController) publishDomain(ctx context.Context, userID int64, domain database.Domain, created bool) {
	flows, err := dc.db.GetFlowsForDomain(ctx, sql.NullInt64{Int64: domain.ID, Valid: true})
	if err != nil {
		flows = nil
	}

	publisher := dc.subs.NewFlowPublisher(userID, domain.ID)
	if created {
		publisher.DomainCreated(ctx, domain, flows)
	} else {
		publisher.DomainUpdated(ctx, domain, flows)
	}
}
