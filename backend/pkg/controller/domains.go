package controller

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"sync"

	"pentagi/pkg/config"
	"pentagi/pkg/crypt"
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

// Scan engagement string constants (mirror the DB CHECK values and GraphQL enums).
const (
	scopeInternal    = "internal"
	boxGrey          = "grey"
	runModeAssistant = "assistant"
)

// CreateDomainParams carries everything needed to orchestrate a domain scan.
type CreateDomainParams struct {
	UserID       int64
	Name         string
	TargetType   string  // used when AutoDetect is false
	TemplateIDs  []int64 // manual selection; may be empty when AutoDetect is true
	AutoDetect   bool
	ProviderName provider.ProviderName
	ProviderType provider.ProviderType

	// Scan engagement fields (new wizard). All zero/empty for classic domain
	// creation, which therefore behaves exactly as before.
	Scope         string              // "internal"|"external"|"" (cloud engagements)
	Box           string              // "grey"|"black"|"" (web engagements)
	Credential    *ScanCredentialSpec // collected only for internal/grey engagements
	TemplateSpecs []ScanTemplateSpec  // per-template run mode; overrides TemplateIDs when set
}

// ScanCredentialSpec is a plaintext target credential to encrypt and store.
// Value must never be logged; it is encrypted via pkg/crypt before storage.
type ScanCredentialSpec struct {
	Kind  string // "web_token"|"email_password"|"cloud_keys"
	Value string
}

// ScanTemplateSpec is a selected template plus the mode it should run in.
type ScanTemplateSpec struct {
	TemplateID int64
	RunMode    string // "automatic"|"assistant"
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

	// Engagement validation (scan wizard). All no-ops for classic domain creation
	// (empty Scope/Box/Credential/TemplateSpecs).
	if params.Scope != "" && params.Box != "" {
		return nil, fmt.Errorf("invalid engagement: set scope (cloud) or box (web), not both")
	}
	hasCredential := params.Credential != nil && strings.TrimSpace(params.Credential.Value) != ""
	needsCredentials := params.Scope == scopeInternal || params.Box == boxGrey
	if hasCredential && !needsCredentials {
		return nil, fmt.Errorf("credentials are only allowed for internal (cloud) / grey-box (web) engagements")
	}
	if hasCredential {
		// Validate before any DB write so a failure never leaves an orphan domain.
		if crypt.IsInsecureSalt(dc.cfg.CookieSigningSalt) {
			return nil, fmt.Errorf("cannot store scan credentials: set a strong COOKIE_SIGNING_SALT")
		}
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
		TargetType:        database.TargetType(targetType),
		Status:            initialStatus,
		DetectionMetadata: json.RawMessage("{}"),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create domain: %w", err)
	}

	dc.RegisterDomain(domain.ID)
	defer dc.UnregisterDomain(domain.ID)
	dc.publishDomain(ctx, params.UserID, domain, true)

	// Scan engagement: persist scope/box and (for authenticated engagements) the
	// encrypted target credential. All no-ops for classic domain creation.
	if params.Scope != "" || params.Box != "" {
		if err := dc.db.SetDomainScopeBox(ctx, database.SetDomainScopeBoxParams{
			ID:    domain.ID,
			Scope: sql.NullString{String: params.Scope, Valid: params.Scope != ""},
			Box:   sql.NullString{String: params.Box, Valid: params.Box != ""},
		}); err != nil {
			return nil, fmt.Errorf("failed to set scope/box for domain %d: %w", domain.ID, err)
		}
		domain.Scope = sql.NullString{String: params.Scope, Valid: params.Scope != ""}
		domain.Box = sql.NullString{String: params.Box, Valid: params.Box != ""}
	}

	// Credentials are only collected for internal (cloud) / grey-box (web)
	// engagements; never for external/black-box (validated above).
	if needsCredentials && hasCredential {
		ciphertext, err := crypt.EncryptCredential(dc.cfg.CookieSigningSalt, params.Credential.Value)
		if err != nil {
			return nil, fmt.Errorf("failed to encrypt scan credential for domain %d: %w", domain.ID, err)
		}
		if _, err := dc.db.CreateScanCredential(ctx, database.CreateScanCredentialParams{
			UserID:     params.UserID,
			DomainID:   domain.ID,
			Kind:       params.Credential.Kind,
			Ciphertext: ciphertext,
		}); err != nil {
			return nil, fmt.Errorf("failed to store scan credential for domain %d: %w", domain.ID, err)
		}
	}

	templateIDs := params.TemplateIDs
	if params.AutoDetect {
		detected, metadata := dc.classifier.Classify(ctx, params.UserID, params.Name, params.ProviderName)
		domain, err = dc.db.UpdateDomainDetectionMetadata(ctx, database.UpdateDomainDetectionMetadataParams{
			ID:                domain.ID,
			TargetType:        database.TargetType(detected),
			DetectionMetadata: metadata,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to store detection metadata for domain %d: %w", domain.ID, err)
		}
		dc.publishDomain(ctx, params.UserID, domain, false)

		if len(templateIDs) == 0 {
			defaults, err := dc.db.GetDefaultFlowTemplatesByTargetType(ctx, database.GetDefaultFlowTemplatesByTargetTypeParams{
				UserID:  params.UserID,
				Column2: database.TargetType(detected),
			})
			if err != nil {
				return nil, fmt.Errorf("failed to load default templates for target type %s: %w", detected, err)
			}
			for _, template := range defaults {
				templateIDs = append(templateIDs, template.ID)
			}
		}
	}

	// Build the spawn list. The scan wizard supplies per-template run modes via
	// TemplateSpecs; classic domain creation maps templateIDs to automatic mode.
	type spawnSpec struct {
		templateID int64
		assistant  bool
	}
	var specs []spawnSpec
	if len(params.TemplateSpecs) > 0 {
		for _, s := range params.TemplateSpecs {
			specs = append(specs, spawnSpec{templateID: s.TemplateID, assistant: s.RunMode == runModeAssistant})
		}
	} else {
		for _, id := range templateIDs {
			specs = append(specs, spawnSpec{templateID: id})
		}
	}

	requested := len(specs)
	truncated := false
	if requested > dc.cfg.MaxFlowsPerDomain {
		specs = specs[:dc.cfg.MaxFlowsPerDomain]
		truncated = true
		logger.WithFields(logrus.Fields{
			"requested": requested,
			"cap":       dc.cfg.MaxFlowsPerDomain,
		}).Warn("domain fan-out truncated to flows-per-domain cap")
	}

	spawned := 0
	for _, spec := range specs {
		var err error
		if spec.assistant {
			_, err = dc.fc.CreateAssistantForDomain(ctx, params.UserID, domain.ID, spec.templateID, params.ProviderName, params.ProviderType)
		} else {
			_, err = dc.fc.CreateFlowForDomain(ctx, params.UserID, domain.ID, spec.templateID, params.ProviderName, params.ProviderType)
		}
		if err != nil {
			var quotaErr *QuotaError
			if errors.As(err, &quotaErr) {
				truncated = true
				logger.WithField("spawned", spawned).Warn("domain fan-out truncated by per-user flow quota")
				break
			}
			logger.WithError(err).WithField("template_id", spec.templateID).Error("failed to spawn child flow for domain")
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

// computeDomainStatusFromFlows derives a scan's status from its child flows:
// running while any flow is still active (created/running/waiting), finished once
// all are terminal and at least one finished, failed only if every flow failed.
// The bool is false when there are no flows to derive a status from.
func computeDomainStatusFromFlows(flows []database.Flow) (database.DomainStatus, bool) {
	if len(flows) == 0 {
		return "", false
	}

	active, finished := 0, 0
	for _, flow := range flows {
		switch flow.Status {
		case database.FlowStatusCreated, database.FlowStatusRunning, database.FlowStatusWaiting:
			active++
		case database.FlowStatusFinished:
			finished++
		}
	}

	switch {
	case active > 0:
		return database.DomainStatusRunning, true
	case finished > 0:
		return database.DomainStatusFinished, true
	default:
		return database.DomainStatusFailed, true
	}
}

// reconcileDomainStatus recomputes a scan's status from its child flows and, if it
// changed, persists and publishes the update. It is best-effort: any error is
// logged, never returned, so a child flow's own status update is never blocked by
// it. It only acts on scans still in "running" — created/classifying are owned by
// the create path and finished/failed are already terminal.
func reconcileDomainStatus(
	ctx context.Context,
	db database.Querier,
	subs subscriptions.SubscriptionsController,
	domainID int64,
) {
	logger := logrus.WithContext(ctx).WithField("domain_id", domainID)

	domain, err := db.GetDomain(ctx, domainID)
	if err != nil {
		logger.WithError(err).Warn("reconcile domain status: failed to load domain")
		return
	}
	if domain.Status != database.DomainStatusRunning {
		return
	}

	flows, err := db.GetFlowsForDomain(ctx, sql.NullInt64{Int64: domainID, Valid: true})
	if err != nil {
		logger.WithError(err).Warn("reconcile domain status: failed to load flows")
		return
	}

	next, ok := computeDomainStatusFromFlows(flows)
	if !ok || next == domain.Status {
		return
	}

	updated, err := db.UpdateDomainStatus(ctx, database.UpdateDomainStatusParams{
		ID:     domainID,
		Status: next,
	})
	if err != nil {
		logger.WithError(err).Warn("reconcile domain status: failed to update status")
		return
	}

	subs.NewFlowPublisher(domain.UserID, domainID).DomainUpdated(ctx, updated, flows)
}
