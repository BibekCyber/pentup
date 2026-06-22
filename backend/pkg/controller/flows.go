package controller

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"sort"
	"sync"

	"pentagi/pkg/config"
	"pentagi/pkg/crypt"
	"pentagi/pkg/database"
	"pentagi/pkg/docker"
	"pentagi/pkg/graph/subscriptions"
	"pentagi/pkg/providers"
	"pentagi/pkg/providers/provider"
	"pentagi/pkg/tools"

	"github.com/sirupsen/logrus"
)

var (
	ErrFlowNotFound       = fmt.Errorf("flow not found")
	ErrFlowAlreadyStopped = fmt.Errorf("flow already stopped")
)

type FlowController interface {
	CreateFlow(
		ctx context.Context,
		userID int64,
		input string,
		prvname provider.ProviderName,
		prvtype provider.ProviderType,
		functions *tools.Functions,
	) (FlowWorker, error)
	// CreateFlowForDomain spawns a child flow for a domain orchestration: it
	// looks up the template text, runs it as the flow input, and links the new
	// flow to the domain and template. It enforces the same per-user flow quota
	// as CreateFlow, returning a *QuotaError so the domain spawn loop can
	// truncate gracefully instead of failing the whole domain.
	CreateFlowForDomain(
		ctx context.Context,
		userID int64,
		domainID int64,
		templateID int64,
		prvname provider.ProviderName,
		prvtype provider.ProviderType,
	) (FlowWorker, error)
	// CreateAssistantForDomain spawns an assistant-mode flow for a scan template
	// (mirrors CreateFlowForDomain but starts the flow in assistant mode).
	CreateAssistantForDomain(
		ctx context.Context,
		userID int64,
		domainID int64,
		templateID int64,
		prvname provider.ProviderName,
		prvtype provider.ProviderType,
	) (AssistantWorker, error)
	// CountActiveFlowsForUser returns how many flows the user currently has in
	// an active status (created/running/waiting). Used for quota checks and the
	// quota-usage query that powers the spawn confirmation screen.
	CountActiveFlowsForUser(ctx context.Context, userID int64) (int64, error)
	CreateAssistant(
		ctx context.Context,
		userID int64,
		flowID int64,
		input string,
		useAgents bool,
		prvname provider.ProviderName,
		prvtype provider.ProviderType,
		functions *tools.Functions,
	) (AssistantWorker, error)
	LoadFlows(ctx context.Context) error
	ListFlows(ctx context.Context) []FlowWorker
	GetFlow(ctx context.Context, flowID int64) (FlowWorker, error)
	StopFlow(ctx context.Context, flowID int64) error
	FinishFlow(ctx context.Context, flowID int64) error
	RenameFlow(ctx context.Context, flowID int64, title string) error
}

type flowController struct {
	db     database.Querier
	mx     *sync.Mutex
	cfg    *config.Config
	flows  map[int64]FlowWorker
	docker docker.DockerClient
	provs  providers.ProviderController
	subs   subscriptions.SubscriptionsController
	alc    AgentLogController
	mlc    MsgLogController
	aslc   AssistantLogController
	slc    SearchLogController
	tlc    TermLogController
	vslc   VectorStoreLogController
	sc     ScreenshotController
}

func NewFlowController(
	db database.Querier,
	cfg *config.Config,
	docker docker.DockerClient,
	provs providers.ProviderController,
	subs subscriptions.SubscriptionsController,
) FlowController {
	return &flowController{
		db:     db,
		mx:     &sync.Mutex{},
		cfg:    cfg,
		flows:  make(map[int64]FlowWorker),
		docker: docker,
		provs:  provs,
		subs:   subs,
		alc:    NewAgentLogController(db),
		mlc:    NewMsgLogController(db),
		aslc:   NewAssistantLogController(db),
		slc:    NewSearchLogController(db),
		tlc:    NewTermLogController(db),
		vslc:   NewVectorStoreLogController(db),
		sc:     NewScreenshotController(db),
	}
}

func (fc *flowController) LoadFlows(ctx context.Context) error {
	flows, err := fc.db.GetFlows(ctx)
	if err != nil {
		return fmt.Errorf("failed to load flows: %w", err)
	}

	for _, flow := range flows {
		fw, err := LoadFlowWorker(ctx, flow, flowWorkerCtx{
			db:     fc.db,
			cfg:    fc.cfg,
			docker: fc.docker,
			provs:  fc.provs,
			subs:   fc.subs,
			flowProviderControllers: flowProviderControllers{
				mlc:  fc.mlc,
				aslc: fc.aslc,
				alc:  fc.alc,
				slc:  fc.slc,
				tlc:  fc.tlc,
				vslc: fc.vslc,
				sc:   fc.sc,
			},
		})
		if err != nil {
			if errors.Is(err, ErrNothingToLoad) {
				continue
			}

			logrus.WithContext(ctx).WithError(err).Errorf("failed to load flow %d", flow.ID)
			continue
		}

		fc.flows[flow.ID] = fw
	}

	return nil
}

func (fc *flowController) CreateFlow(
	ctx context.Context,
	userID int64,
	input string,
	prvname provider.ProviderName,
	prvtype provider.ProviderType,
	functions *tools.Functions,
) (FlowWorker, error) {
	fc.mx.Lock()
	defer fc.mx.Unlock()

	if err := fc.checkUserFlowQuota(ctx, userID); err != nil {
		return nil, err
	}

	fw, err := NewFlowWorker(ctx, newFlowWorkerCtx{
		userID:    userID,
		input:     input,
		prvname:   prvname,
		prvtype:   prvtype,
		functions: functions,
		flowWorkerCtx: flowWorkerCtx{
			db:     fc.db,
			cfg:    fc.cfg,
			docker: fc.docker,
			provs:  fc.provs,
			subs:   fc.subs,
			flowProviderControllers: flowProviderControllers{
				mlc:  fc.mlc,
				aslc: fc.aslc,
				alc:  fc.alc,
				slc:  fc.slc,
				tlc:  fc.tlc,
				vslc: fc.vslc,
				sc:   fc.sc,
			},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create flow worker: %w", err)
	}

	fc.flows[fw.GetFlowID()] = fw

	return fw, nil
}

// checkUserFlowQuota rejects flow creation when the user is already at the
// per-user concurrent-flow cap. Callers must hold fc.mx so concurrent spawn
// attempts cannot race past the limit.
func (fc *flowController) checkUserFlowQuota(ctx context.Context, userID int64) error {
	count, err := fc.db.CountActiveFlowsForUser(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to count active flows for user %d: %w", userID, err)
	}

	if int(count) >= fc.cfg.MaxConcurrentFlowsPerUser {
		logrus.WithContext(ctx).WithFields(logrus.Fields{
			"user_id": userID,
			"active":  count,
			"limit":   fc.cfg.MaxConcurrentFlowsPerUser,
		}).Warn("flow creation rejected: per-user concurrency quota exceeded")
		return &QuotaError{Quota: QuotaFlows, Current: int(count), Max: fc.cfg.MaxConcurrentFlowsPerUser}
	}

	return nil
}

func (fc *flowController) CountActiveFlowsForUser(ctx context.Context, userID int64) (int64, error) {
	return fc.db.CountActiveFlowsForUser(ctx, userID)
}

// loadScanCredential returns the decrypted target credential for a scan domain,
// or (nil, nil) when none is stored (classic domains, or external/black-box
// engagements where Phase-1 gating never persisted one).
func (fc *flowController) loadScanCredential(ctx context.Context, userID, domainID int64) (*flowCredential, error) {
	sc, err := fc.db.GetActiveScanCredentialForDomain(ctx, domainID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to load scan credential for domain %d: %w", domainID, err)
	}

	// Defense-in-depth: never decrypt/deliver a credential belonging to another
	// user, even if a caller passes a mismatched domain id.
	if sc.UserID != userID {
		return nil, fmt.Errorf("scan credential for domain %d does not belong to user %d", domainID, userID)
	}

	value, err := crypt.DecryptCredential(fc.cfg.CookieSigningSalt, sc.Ciphertext)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt scan credential for domain %d: %w", domainID, err)
	}

	return &flowCredential{Kind: sc.Kind, Value: value}, nil
}

func (fc *flowController) CreateFlowForDomain(
	ctx context.Context,
	userID int64,
	domainID int64,
	templateID int64,
	prvname provider.ProviderName,
	prvtype provider.ProviderType,
) (FlowWorker, error) {
	fc.mx.Lock()
	defer fc.mx.Unlock()

	if err := fc.checkUserFlowQuota(ctx, userID); err != nil {
		return nil, err
	}

	template, err := fc.db.GetFlowTemplate(ctx, database.GetFlowTemplateParams{
		ID:     templateID,
		UserID: userID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get template %d for domain %d: %w", templateID, domainID, err)
	}

	// Authenticated engagements (internal cloud / grey-box web) carry an
	// encrypted credential; decrypt it so the agent can authenticate. Its
	// presence gates the authenticate-first directive + container delivery.
	cred, err := fc.loadScanCredential(ctx, userID, domainID)
	if err != nil {
		return nil, err
	}

	fw, err := NewFlowWorker(ctx, newFlowWorkerCtx{
		userID:     userID,
		input:      template.Text,
		prvname:    prvname,
		prvtype:    prvtype,
		credential: cred,
		flowWorkerCtx: flowWorkerCtx{
			db:     fc.db,
			cfg:    fc.cfg,
			docker: fc.docker,
			provs:  fc.provs,
			subs:   fc.subs,
			flowProviderControllers: flowProviderControllers{
				mlc:  fc.mlc,
				aslc: fc.aslc,
				alc:  fc.alc,
				slc:  fc.slc,
				tlc:  fc.tlc,
				vslc: fc.vslc,
				sc:   fc.sc,
			},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create flow worker for domain %d: %w", domainID, err)
	}

	fc.flows[fw.GetFlowID()] = fw

	if err := fc.db.SetFlowDomain(ctx, database.SetFlowDomainParams{
		ID:         fw.GetFlowID(),
		DomainID:   sql.NullInt64{Int64: domainID, Valid: true},
		TemplateID: sql.NullInt64{Int64: templateID, Valid: true},
	}); err != nil {
		return nil, fmt.Errorf("failed to link flow %d to domain %d: %w", fw.GetFlowID(), domainID, err)
	}

	return fw, nil
}

func (fc *flowController) CreateAssistantForDomain(
	ctx context.Context,
	userID int64,
	domainID int64,
	templateID int64,
	prvname provider.ProviderName,
	prvtype provider.ProviderType,
) (AssistantWorker, error) {
	// CreateAssistant does not enforce the per-user flow quota; replicate the
	// truncation semantics of CreateFlowForDomain here. checkUserFlowQuota is
	// lock-free (db count only), so it is safe to call before CreateAssistant
	// (which takes fc.mx itself) without nesting locks.
	if err := fc.checkUserFlowQuota(ctx, userID); err != nil {
		return nil, err
	}

	template, err := fc.db.GetFlowTemplate(ctx, database.GetFlowTemplateParams{
		ID:     templateID,
		UserID: userID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get template %d for domain %d: %w", templateID, domainID, err)
	}

	// flowID=0 -> CreateAssistant creates a dry-run host flow (Waiting) and
	// attaches the assistant; useAgents=true gives the full sub-agent toolset.
	aw, err := fc.CreateAssistant(ctx, userID, 0, template.Text, true, prvname, prvtype, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create assistant for domain %d: %w", domainID, err)
	}

	if err := fc.db.SetFlowDomain(ctx, database.SetFlowDomainParams{
		ID:         aw.GetFlowID(),
		DomainID:   sql.NullInt64{Int64: domainID, Valid: true},
		TemplateID: sql.NullInt64{Int64: templateID, Valid: true},
	}); err != nil {
		return nil, fmt.Errorf("failed to link assistant flow %d to domain %d: %w", aw.GetFlowID(), domainID, err)
	}

	return aw, nil
}

func (fc *flowController) CreateAssistant(
	ctx context.Context,
	userID int64,
	flowID int64,
	input string,
	useAgents bool,
	prvname provider.ProviderName,
	prvtype provider.ProviderType,
	functions *tools.Functions,
) (AssistantWorker, error) {
	fc.mx.Lock()
	defer fc.mx.Unlock()

	var (
		fw  FlowWorker
		ok  bool
		err error
	)

	flowWorkerCtx := flowWorkerCtx{
		db:     fc.db,
		cfg:    fc.cfg,
		docker: fc.docker,
		provs:  fc.provs,
		subs:   fc.subs,
		flowProviderControllers: flowProviderControllers{
			mlc:  fc.mlc,
			aslc: fc.aslc,
			alc:  fc.alc,
			slc:  fc.slc,
			tlc:  fc.tlc,
			vslc: fc.vslc,
			sc:   fc.sc,
		},
	}

	newFlow := func() error {
		fw, err = NewFlowWorker(ctx, newFlowWorkerCtx{
			userID:        userID,
			input:         input,
			dryRun:        true,
			prvname:       prvname,
			prvtype:       prvtype,
			functions:     functions,
			flowWorkerCtx: flowWorkerCtx,
		})
		if err != nil {
			return fmt.Errorf("failed to create flow worker: %w", err)
		}

		fc.flows[fw.GetFlowID()] = fw
		flowID = fw.GetFlowID()
		fw.SetStatus(ctx, database.FlowStatusWaiting)

		return nil
	}

	loadFlow := func() error {
		flow, err := fc.db.UpdateFlowStatus(ctx, database.UpdateFlowStatusParams{
			ID:     flowID,
			Status: database.FlowStatusWaiting,
		})
		if err != nil {
			return fmt.Errorf("failed to renew flow %d status: %w", flowID, err)
		}

		fw, err = LoadFlowWorker(ctx, flow, flowWorkerCtx)
		if err != nil {
			return fmt.Errorf("failed to load flow %d: %w", flowID, err)
		}

		fc.flows[flowID] = fw

		return nil
	}

	if flowID == 0 {
		if err := newFlow(); err != nil {
			return nil, err
		}
	} else if fw, ok = fc.flows[flowID]; ok {
		status, err := fw.GetStatus(ctx)
		if err != nil {
			return nil, fmt.Errorf("failed to get flow %d status: %w", flowID, err)
		}

		switch status {
		case database.FlowStatusCreated:
			return nil, fmt.Errorf("flow %d is not completed", flowID)
		case database.FlowStatusFinished, database.FlowStatusFailed:
			if err := loadFlow(); err != nil {
				return nil, err
			}
		case database.FlowStatusRunning, database.FlowStatusWaiting:
			break
		default:
			return nil, fmt.Errorf("flow %d is in unknown status: %s", flowID, status)
		}
	} else {
		if err := loadFlow(); err != nil {
			return nil, err
		}
	}

	if fw == nil { // just double check, this should never happen
		return nil, fmt.Errorf("unexpected error: flow %d not found", flowID)
	}

	aw, err := NewAssistantWorker(ctx, newAssistantWorkerCtx{
		userID:        userID,
		flowID:        flowID,
		input:         input,
		prvname:       prvname,
		prvtype:       prvtype,
		useAgents:     useAgents,
		functions:     functions,
		flowWorkerCtx: flowWorkerCtx,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create assistant: %w", err)
	}

	if err = fw.AddAssistant(ctx, aw); err != nil {
		return nil, fmt.Errorf("failed to add assistant to flow: %w", err)
	}

	return aw, nil
}

func (fc *flowController) ListFlows(ctx context.Context) []FlowWorker {
	fc.mx.Lock()
	defer fc.mx.Unlock()

	flows := make([]FlowWorker, 0)
	for _, flow := range fc.flows {
		flows = append(flows, flow)
	}

	sort.Slice(flows, func(i, j int) bool {
		return flows[i].GetFlowID() < flows[j].GetFlowID()
	})

	return flows
}

func (fc *flowController) GetFlow(ctx context.Context, flowID int64) (FlowWorker, error) {
	fc.mx.Lock()
	defer fc.mx.Unlock()

	flow, ok := fc.flows[flowID]
	if !ok {
		return nil, ErrFlowNotFound
	}

	return flow, nil
}

func (fc *flowController) StopFlow(ctx context.Context, flowID int64) error {
	fc.mx.Lock()
	defer fc.mx.Unlock()

	flow, ok := fc.flows[flowID]
	if !ok {
		return ErrFlowNotFound
	}

	err := flow.Stop(ctx)
	if err != nil {
		return fmt.Errorf("failed to stop flow %d: %w", flowID, err)
	}

	return nil
}

func (fc *flowController) FinishFlow(ctx context.Context, flowID int64) error {
	fc.mx.Lock()
	defer fc.mx.Unlock()

	flow, ok := fc.flows[flowID]
	if !ok {
		return ErrFlowNotFound
	}

	err := flow.Finish(ctx)
	if err != nil {
		return fmt.Errorf("failed to finish flow %d: %w", flowID, err)
	}

	delete(fc.flows, flowID)

	return nil
}

func (fc *flowController) RenameFlow(ctx context.Context, flowID int64, title string) error {
	fc.mx.Lock()
	defer fc.mx.Unlock()

	flow, ok := fc.flows[flowID]
	if !ok {
		return ErrFlowNotFound
	}

	return flow.Rename(ctx, title)
}
