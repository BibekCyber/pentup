package controller

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"sort"
	"sync"
	"time"

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
		// credential, when non-nil (authenticated scan engagements), is delivered
		// to the assistant the same way automatic flows get it: written to the
		// container as a secret file, seeded into the redaction replacer, and
		// referenced by an authenticate-first directive prepended to the input.
		credential *flowCredential,
	) (AssistantWorker, error)
	LoadFlows(ctx context.Context) error
	ListFlows(ctx context.Context) []FlowWorker
	GetFlow(ctx context.Context, flowID int64) (FlowWorker, error)
	StopFlow(ctx context.Context, flowID int64) error
	FinishFlow(ctx context.Context, flowID int64) error
	// DeleteFlow performs the full teardown of a single flow: it closes the flow
	// through FinishFlow (which releases its worker and Docker containers, also
	// for flows that were never loaded), soft-deletes the flow row, then
	// publishes FlowUpdated + FlowDeleted. Used both by the single-flow delete
	// resolver and the domain cascade.
	DeleteFlow(ctx context.Context, flowID int64) error
	RenameFlow(ctx context.Context, flowID int64, title string) error
}

// flowFinishTimeout bounds closing a flow once it is detached from the request
// context. It is generous because it covers stopping and removing the sandbox
// containers, and only exists so a stuck docker daemon cannot pin the goroutine
// forever.
const flowFinishTimeout = 5 * time.Minute

// flowLeftoversTimeout bounds closing what the worker did not hold in memory.
// It is separate from flowFinishTimeout because those writes must still land
// after a stuck sandbox has spent the whole finish budget.
const flowLeftoversTimeout = 30 * time.Second

// flowEntry is one flow's slot in the registry. fc.mx guards its fields; op is
// held across a lifecycle call and must never be taken while fc.mx is held.
type flowEntry struct {
	op      chan struct{}
	worker  FlowWorker
	closing bool

	// deleteOnClose makes the teardown soft-delete the flow before it gives up
	// the slot, so nothing can reload the flow between its finish and delete.
	deleteOnClose bool

	// done is closed once the teardown of an unloaded flow has ended and its
	// slot is gone; it is nil on a slot that holds a worker.
	done chan struct{}
}

func newFlowEntry(worker FlowWorker) *flowEntry {
	return &flowEntry{op: make(chan struct{}, 1), worker: worker}
}

func (e *flowEntry) acquire(ctx context.Context) bool {
	select {
	case e.op <- struct{}{}:
		return true
	case <-ctx.Done():
		return false
	}
}

func (e *flowEntry) lock() {
	e.op <- struct{}{}
}

func (e *flowEntry) release() {
	<-e.op
}

func (e *flowEntry) available() bool {
	return e.worker != nil && !e.closing
}

type flowController struct {
	db     database.Querier
	mx     *sync.Mutex
	cfg    *config.Config
	flows  map[int64]*flowEntry
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
		flows:  make(map[int64]*flowEntry),
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

// registerLocked puts a serving worker in flowID's slot. Callers hold fc.mx.
func (fc *flowController) registerLocked(flowID int64, worker FlowWorker) {
	fc.flows[flowID] = newFlowEntry(worker)
}

// unregisterLocked drops flowID's slot if it is still entry. Callers hold fc.mx.
func (fc *flowController) unregisterLocked(flowID int64, entry *flowEntry) {
	if fc.flows[flowID] == entry {
		delete(fc.flows, flowID)
	}
}

// lockSettled takes fc.mx once no teardown of an unloaded flow holds flowID's
// slot, so a delete or a new assistant acts on the flow the teardown left and
// not on containers still being removed. It returns with fc.mx held, or with
// ctx's error and fc.mx released.
func (fc *flowController) lockSettled(ctx context.Context, flowID int64) (*flowEntry, bool, error) {
	for {
		fc.mx.Lock()
		entry, ok := fc.flows[flowID]
		if !ok || entry.done == nil {
			return entry, ok, nil
		}
		done := entry.done
		fc.mx.Unlock()

		select {
		case <-done:
		case <-ctx.Done():
			return nil, false, ctx.Err()
		}
	}
}

func (fc *flowController) entryOf(flowID int64) (*flowEntry, bool) {
	fc.mx.Lock()
	defer fc.mx.Unlock()

	entry, ok := fc.flows[flowID]
	if !ok || !entry.available() {
		return nil, false
	}

	return entry, true
}

// claim hands out a flow with its lifecycle lock already held: the caller must
// release it with defer entry.release().
func (fc *flowController) claim(ctx context.Context, flowID int64) (*flowEntry, FlowWorker, bool) {
	entry, ok := fc.entryOf(flowID)
	if !ok {
		return nil, nil, false
	}

	if !entry.acquire(ctx) {
		return nil, nil, false
	}

	fc.mx.Lock()
	still := fc.flows[flowID] == entry && entry.available()
	worker := entry.worker
	fc.mx.Unlock()

	if !still {
		entry.release()
		return nil, nil, false
	}

	return entry, worker, true
}

func (fc *flowController) LoadFlows(ctx context.Context) error {
	flows, err := fc.db.GetFlows(ctx)
	if err != nil {
		return fmt.Errorf("failed to load flows: %w", err)
	}

	domainIDs := make(map[int64]struct{})
	for _, flow := range flows {
		if flow.DomainID.Valid {
			domainIDs[flow.DomainID.Int64] = struct{}{}
		}

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

		fc.mx.Lock()
		fc.registerLocked(flow.ID, fw)
		fc.mx.Unlock()
	}

	// Re-derive each parent scan's status from its child flows. Flow statuses can
	// change while the server is down (or predate the scan-status feature), and
	// reconcileDomainStatus otherwise only fires on a live status change — so
	// without this pass a scan whose flows are all `waiting` would keep showing
	// `running` after a restart until the next status change.
	for domainID := range domainIDs {
		reconcileDomainStatus(ctx, fc.db, fc.subs, domainID)
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

	fc.registerLocked(fw.GetFlowID(), fw)

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

// buildDomainFlowInput prepends the scan target to a template playbook so the
// spawned flow knows WHAT to test. Templates are written generically ("test the
// target web application"); without the target name the agent has to guess it or
// (in assistant mode) ask the user for it.
func buildDomainFlowInput(domain database.Domain, templateText string) string {
	return fmt.Sprintf(
		"The target for this engagement is: %s (%s).\n\n%s",
		domain.Name, domain.TargetType, templateText,
	)
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

	template, err := fc.db.GetFlowTemplate(ctx, templateID)
	if err != nil {
		return nil, fmt.Errorf("failed to get template %d for domain %d: %w", templateID, domainID, err)
	}

	domain, err := fc.db.GetDomain(ctx, domainID)
	if err != nil {
		return nil, fmt.Errorf("failed to get domain %d: %w", domainID, err)
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
		input:      buildDomainFlowInput(domain, template.Text),
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

	fc.registerLocked(fw.GetFlowID(), fw)

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

	template, err := fc.db.GetFlowTemplate(ctx, templateID)
	if err != nil {
		return nil, fmt.Errorf("failed to get template %d for domain %d: %w", templateID, domainID, err)
	}

	domain, err := fc.db.GetDomain(ctx, domainID)
	if err != nil {
		return nil, fmt.Errorf("failed to get domain %d: %w", domainID, err)
	}

	// Authenticated engagements (internal cloud / grey-box web) carry an encrypted
	// credential; decrypt it so the assistant can authenticate (delivered as a
	// container file + redaction seed + authenticate-first directive).
	cred, err := fc.loadScanCredential(ctx, userID, domainID)
	if err != nil {
		return nil, err
	}

	// flowID=0 -> CreateAssistant creates a dry-run host flow (Waiting) and
	// attaches the assistant; useAgents=true gives the full sub-agent toolset.
	aw, err := fc.CreateAssistant(ctx, userID, 0, buildDomainFlowInput(domain, template.Text), true, prvname, prvtype, nil, cred)
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
	credential *flowCredential,
) (AssistantWorker, error) {
	// For an existing flow, wait out the teardown of an unloaded flow so the
	// assistant acts on what it left, and refuse a loaded flow that is being
	// finished rather than join a worker that is going away.
	var (
		entry  *flowEntry
		loaded bool
	)
	if flowID == 0 {
		fc.mx.Lock()
	} else {
		var err error
		if entry, loaded, err = fc.lockSettled(ctx, flowID); err != nil {
			return nil, err
		}
	}
	defer fc.mx.Unlock()

	if loaded && entry.closing {
		return nil, ErrFlowNotFound
	}

	var (
		fw  FlowWorker
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
			credential:    credential, // host flow's Prepare writes the credential file into the shared container
			flowWorkerCtx: flowWorkerCtx,
		})
		if err != nil {
			return fmt.Errorf("failed to create flow worker: %w", err)
		}

		fc.registerLocked(fw.GetFlowID(), fw)
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

		fc.registerLocked(flowID, fw)

		return nil
	}

	if flowID == 0 {
		if err := newFlow(); err != nil {
			return nil, err
		}
	} else if loaded {
		fw = entry.worker
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
		// GetFlow skips soft-deleted rows, while loadFlow's status update does
		// not: check first so a deleted flow is never revived.
		flow, err := fc.db.GetFlow(ctx, flowID)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return nil, ErrFlowNotFound
			}
			return nil, fmt.Errorf("failed to get flow %d: %w", flowID, err)
		}
		if flow.Status == database.FlowStatusCreated {
			return nil, fmt.Errorf("flow %d is not completed", flowID)
		}

		if err := loadFlow(); err != nil {
			return nil, err
		}
	}

	if fw == nil { // just double check, this should never happen
		return nil, fmt.Errorf("unexpected error: flow %d not found", flowID)
	}

	aw, err := NewAssistantWorker(ctx, newAssistantWorkerCtx{
		userID:     userID,
		flowID:     flowID,
		input:      input,
		prvname:    prvname,
		prvtype:    prvtype,
		useAgents:  useAgents,
		functions:  functions,
		credential: credential, // seeds the assistant's redaction replacer + auth directive

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
	flows := make([]FlowWorker, 0, len(fc.flows))
	for _, entry := range fc.flows {
		if entry.available() {
			flows = append(flows, entry.worker)
		}
	}
	fc.mx.Unlock()

	sort.Slice(flows, func(i, j int) bool {
		return flows[i].GetFlowID() < flows[j].GetFlowID()
	})

	return flows
}

func (fc *flowController) GetFlow(ctx context.Context, flowID int64) (FlowWorker, error) {
	entry, ok := fc.entryOf(flowID)
	if !ok {
		return nil, ErrFlowNotFound
	}

	return entry.worker, nil
}

func (fc *flowController) StopFlow(ctx context.Context, flowID int64) error {
	entry, flow, ok := fc.claim(ctx, flowID)
	if !ok {
		return fc.missingFlowError(ctx, flowID)
	}
	defer entry.release()

	if err := flow.Stop(ctx); err != nil {
		return fmt.Errorf("failed to stop flow %d: %w", flowID, err)
	}

	return nil
}

func (fc *flowController) FinishFlow(ctx context.Context, flowID int64) error {
	return fc.closeFlow(ctx, flowID, flowFinishTimeout, false)
}

func (fc *flowController) DeleteFlow(ctx context.Context, flowID int64) error {
	return fc.closeFlow(ctx, flowID, flowFinishTimeout, true)
}

// closeFlow finishes a flow, and soft-deletes it when del is set, without
// holding fc.mx across the teardown, so a flow that is slow to stop never
// blocks the other flows on the server. While the teardown runs the slot stays
// in the registry marked closing: GetFlow, claim and ListFlows stop handing out
// the worker and CreateAssistant refuses the flow. A second finish of a loaded
// flow returns at once rather than run the teardown again, and a delete that
// arrives meanwhile is carried out by the teardown in progress once it ends.
func (fc *flowController) closeFlow(ctx context.Context, flowID int64, budget time.Duration, del bool) error {
	entry, loaded, err := fc.lockSettled(ctx, flowID)
	if err != nil {
		return err
	}

	if loaded && entry.closing {
		if del {
			entry.deleteOnClose = true
		}
		fc.mx.Unlock()
		return nil
	}

	if !loaded {
		// A closing slot rather than fc.mx guards the teardown: other flows stay
		// served, and no assistant reloads this one while its containers go.
		entry = newFlowEntry(nil)
		entry.done = make(chan struct{})
		fc.flows[flowID] = entry
	}
	entry.closing = true
	entry.deleteOnClose = entry.deleteOnClose || del
	fc.mx.Unlock()

	teardownErr := fc.tearDownFlow(ctx, flowID, entry, budget)

	settleCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), flowLeftoversTimeout)
	defer cancel()

	return fc.settleClosedFlow(settleCtx, flowID, entry, teardownErr)
}

// tearDownFlow stops the flow's worker, if it has one, and closes what the flow
// left open: tasks, subtasks, assistants, containers and the flow status. It is
// detached from the request, so a client that disconnects cannot leave the flow
// half closed.
func (fc *flowController) tearDownFlow(ctx context.Context, flowID int64, entry *flowEntry, budget time.Duration) error {
	if entry.worker == nil {
		unloadedCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), budget)
		defer cancel()

		return fc.finishUnloadedFlow(unloadedCtx, flowID)
	}

	// Wait for a stop or rename already in progress on this flow.
	entry.lock()
	defer entry.release()

	finishCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), budget)
	defer cancel()

	finishErr := entry.worker.Finish(finishCtx)

	leftoversCtx, cancelLeftovers := context.WithTimeout(context.WithoutCancel(ctx), flowLeftoversTimeout)
	defer cancelLeftovers()

	if finishErr != nil {
		// The worker did not close the flow (a sandbox that would not stop, or a
		// worker that did not exit within the budget): close what it left, so the
		// flow does not stay running with no worker behind it.
		return errors.Join(
			fmt.Errorf("failed to finish flow %d: %w", flowID, finishErr),
			fc.finishUnloadedFlow(leftoversCtx, flowID),
		)
	}

	return fc.finishFlowLeftovers(leftoversCtx, flowID)
}

// settleClosedFlow ends a teardown: it soft-deletes the flow if a delete was
// asked for, then gives up the slot. deleteOnClose is checked under the same
// lock that drops the slot, so a delete arriving during the teardown is either
// carried out here or finds the slot gone and runs a teardown of its own.
func (fc *flowController) settleClosedFlow(ctx context.Context, flowID int64, entry *flowEntry, teardownErr error) error {
	defer func() {
		if entry.done != nil {
			close(entry.done)
		}
	}()

	fc.mx.Lock()
	if !entry.deleteOnClose {
		fc.unregisterLocked(flowID, entry)
		fc.mx.Unlock()
		return teardownErr
	}
	fc.mx.Unlock()

	err := fc.deleteClosedFlow(ctx, flowID, teardownErr)

	fc.mx.Lock()
	fc.unregisterLocked(flowID, entry)
	fc.mx.Unlock()

	return err
}

// deleteClosedFlow soft-deletes a flow after its teardown. A teardown error does
// not stop the delete of a flow that ended up closed, so a passing database or
// docker error cannot orphan a scan's child flows; a flow still open is kept so
// the delete can be retried.
func (fc *flowController) deleteClosedFlow(ctx context.Context, flowID int64, teardownErr error) error {
	flow, err := fc.db.GetFlow(ctx, flowID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrFlowNotFound
		}
		return errors.Join(teardownErr, fmt.Errorf("failed to get flow %d: %w", flowID, err))
	}

	if teardownErr != nil {
		if flow.Status != database.FlowStatusFinished && flow.Status != database.FlowStatusFailed {
			return teardownErr
		}
		logrus.WithContext(ctx).WithError(teardownErr).WithField("flow_id", flowID).
			Warn("deleting a closed flow despite an error while tearing it down")
	}

	containers, err := fc.db.GetFlowContainers(ctx, flowID)
	if err != nil {
		return fmt.Errorf("failed to get containers for flow %d: %w", flowID, err)
	}

	if _, err := fc.db.DeleteFlow(ctx, flowID); err != nil {
		return fmt.Errorf("failed to delete flow %d: %w", flowID, err)
	}

	publisher := fc.subs.NewFlowPublisher(flow.UserID, flow.ID)
	publisher.FlowUpdated(ctx, flow, containers)
	publisher.FlowDeleted(ctx, flow, containers)

	return nil
}

func (fc *flowController) RenameFlow(ctx context.Context, flowID int64, title string) error {
	entry, flow, ok := fc.claim(ctx, flowID)
	if !ok {
		return fc.missingFlowError(ctx, flowID)
	}
	defer entry.release()

	return flow.Rename(ctx, title)
}
