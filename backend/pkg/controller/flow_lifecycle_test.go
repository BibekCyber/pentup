package controller

import (
	"context"
	"database/sql"
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"pentagi/pkg/database"
	"pentagi/pkg/docker"
	"pentagi/pkg/graph/subscriptions"
)

// Lifecycle tests for flowController: a finish runs outside fc.mx, takes the flow
// out of service while it runs, happens once, closes the flow even when its
// worker cannot, and a delete happens inside the same teardown.

const lifecycleFlowID int64 = 51

type lifecycleQuerier struct {
	database.Querier

	mu         sync.Mutex
	status     database.FlowStatus
	domainID   sql.NullInt64
	containers []database.Container
	missing    bool
	deleted    bool
	statusSets []database.FlowStatus
	tasksReads int
	tasksErr   error

	// tasksGate, when set, holds GetFlowTasks until it is closed, so a test can
	// act while a teardown is in progress.
	tasksGate chan struct{}

	domainStatus     database.DomainStatus
	domainStatusSets []database.DomainStatus
}

func (q *lifecycleQuerier) flowLocked(id int64) database.Flow {
	return database.Flow{ID: id, UserID: 1, Status: q.status, DomainID: q.domainID}
}

func (q *lifecycleQuerier) GetFlow(_ context.Context, id int64) (database.Flow, error) {
	q.mu.Lock()
	defer q.mu.Unlock()

	if q.missing || q.deleted {
		return database.Flow{}, sql.ErrNoRows
	}
	return q.flowLocked(id), nil
}

func (q *lifecycleQuerier) GetFlowTasks(context.Context, int64) ([]database.Task, error) {
	if q.tasksGate != nil {
		<-q.tasksGate
	}

	q.mu.Lock()
	defer q.mu.Unlock()

	q.tasksReads++
	return nil, q.tasksErr
}

func (q *lifecycleQuerier) GetFlowAssistants(context.Context, int64) ([]database.Assistant, error) {
	return nil, nil
}

func (q *lifecycleQuerier) GetFlowContainers(context.Context, int64) ([]database.Container, error) {
	q.mu.Lock()
	defer q.mu.Unlock()

	return q.containers, nil
}

func (q *lifecycleQuerier) UpdateFlowStatus(_ context.Context, arg database.UpdateFlowStatusParams) (database.Flow, error) {
	q.mu.Lock()
	defer q.mu.Unlock()

	q.status = arg.Status
	q.statusSets = append(q.statusSets, arg.Status)
	return q.flowLocked(arg.ID), nil
}

func (q *lifecycleQuerier) DeleteFlow(_ context.Context, id int64) (database.Flow, error) {
	q.mu.Lock()
	defer q.mu.Unlock()

	q.deleted = true
	return q.flowLocked(id), nil
}

func (q *lifecycleQuerier) GetDomain(_ context.Context, id int64) (database.Domain, error) {
	q.mu.Lock()
	defer q.mu.Unlock()

	return database.Domain{ID: id, UserID: 1, Status: q.domainStatus}, nil
}

func (q *lifecycleQuerier) GetFlowsForDomain(_ context.Context, _ sql.NullInt64) ([]database.Flow, error) {
	q.mu.Lock()
	defer q.mu.Unlock()

	return []database.Flow{q.flowLocked(lifecycleFlowID)}, nil
}

func (q *lifecycleQuerier) UpdateDomainStatus(_ context.Context, arg database.UpdateDomainStatusParams) (database.Domain, error) {
	q.mu.Lock()
	defer q.mu.Unlock()

	q.domainStatus = arg.Status
	q.domainStatusSets = append(q.domainStatusSets, arg.Status)
	return database.Domain{ID: arg.ID, UserID: 1, Status: arg.Status}, nil
}

func (q *lifecycleQuerier) snapshot() (database.FlowStatus, bool, []database.FlowStatus) {
	q.mu.Lock()
	defer q.mu.Unlock()

	return q.status, q.deleted, append([]database.FlowStatus(nil), q.statusSets...)
}

type lifecyclePublisher struct {
	subscriptions.FlowPublisher
}

func (lifecyclePublisher) FlowUpdated(context.Context, database.Flow, []database.Container) {}
func (lifecyclePublisher) FlowDeleted(context.Context, database.Flow, []database.Container) {}
func (lifecyclePublisher) TaskUpdated(context.Context, database.Task, []database.Subtask)   {}
func (lifecyclePublisher) AssistantUpdated(context.Context, database.Assistant)             {}
func (lifecyclePublisher) DomainUpdated(context.Context, database.Domain, []database.Flow)  {}

type lifecycleSubs struct {
	subscriptions.SubscriptionsController
}

func (lifecycleSubs) NewFlowPublisher(int64, int64) subscriptions.FlowPublisher {
	return lifecyclePublisher{}
}

type lifecycleDocker struct {
	docker.DockerClient

	mu      sync.Mutex
	removed []string
}

func (d *lifecycleDocker) RemoveContainer(_ context.Context, containerID string, _ int64) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	d.removed = append(d.removed, containerID)
	return nil
}

func (d *lifecycleDocker) removedIDs() []string {
	d.mu.Lock()
	defer d.mu.Unlock()

	return append([]string(nil), d.removed...)
}

// gatedFlowWorker blocks Finish and Stop until released, so a test can act while
// a lifecycle call is in progress. With honorCtx, Finish gives up when its
// context ends, like the real worker's bounded wait.
type gatedFlowWorker struct {
	FlowWorker

	finishEntered chan struct{}
	finishRelease chan struct{}
	finishErr     error
	honorCtx      bool
	finishes      atomic.Int32

	stopEntered chan struct{}
	stopRelease chan struct{}
}

func newGatedFlowWorker() *gatedFlowWorker {
	return &gatedFlowWorker{
		finishEntered: make(chan struct{}, 4),
		finishRelease: make(chan struct{}),
		stopEntered:   make(chan struct{}, 4),
		stopRelease:   make(chan struct{}),
	}
}

func (w *gatedFlowWorker) GetFlowID() int64 { return lifecycleFlowID }

func (w *gatedFlowWorker) Finish(ctx context.Context) error {
	w.finishes.Add(1)
	w.finishEntered <- struct{}{}

	if w.honorCtx {
		select {
		case <-w.finishRelease:
		case <-ctx.Done():
			return ctx.Err()
		}
	} else {
		<-w.finishRelease
	}

	return w.finishErr
}

func (w *gatedFlowWorker) Stop(context.Context) error {
	w.stopEntered <- struct{}{}
	<-w.stopRelease
	return nil
}

func newLifecycleController(q *lifecycleQuerier, d *lifecycleDocker) *flowController {
	return &flowController{
		db:     q,
		mx:     &sync.Mutex{},
		flows:  map[int64]*flowEntry{},
		subs:   lifecycleSubs{},
		docker: d,
	}
}

func (fc *flowController) registerForTest(worker FlowWorker) {
	fc.mx.Lock()
	defer fc.mx.Unlock()

	fc.registerLocked(lifecycleFlowID, worker)
}

func (fc *flowController) hasSlot(flowID int64) bool {
	fc.mx.Lock()
	defer fc.mx.Unlock()

	_, ok := fc.flows[flowID]
	return ok
}

func waitFor(t *testing.T, ch <-chan struct{}, what string) {
	t.Helper()
	select {
	case <-ch:
	case <-time.After(finishDeadline):
		t.Fatalf("timed out waiting for %s", what)
	}
}

func runAsync(fn func() error) <-chan error {
	done := make(chan error, 1)
	go func() { done <- fn() }()
	return done
}

func expectPending(t *testing.T, done <-chan error, what string) {
	t.Helper()
	select {
	case err := <-done:
		t.Fatalf("%s returned early (err=%v)", what, err)
	case <-time.After(100 * time.Millisecond):
	}
}

func expectResult(t *testing.T, done <-chan error, what string) error {
	t.Helper()
	select {
	case err := <-done:
		return err
	case <-time.After(finishDeadline):
		t.Fatalf("%s did not return", what)
		return nil
	}
}

// The production hang: one flow's finish must never block another flow.
func TestFinishFlowDoesNotHoldControllerLock(t *testing.T) {
	worker := newGatedFlowWorker()
	fc := newLifecycleController(&lifecycleQuerier{status: database.FlowStatusWaiting}, &lifecycleDocker{})
	fc.registerForTest(worker)

	finished := runAsync(func() error { return fc.FinishFlow(context.Background(), lifecycleFlowID) })
	waitFor(t, worker.finishEntered, "Finish to start")

	other := runAsync(func() error {
		_, err := fc.GetFlow(context.Background(), 999)
		return err
	})
	if err := expectResult(t, other, "GetFlow of another flow"); !errors.Is(err, ErrFlowNotFound) {
		t.Fatalf("GetFlow returned %v, want ErrFlowNotFound", err)
	}

	close(worker.finishRelease)
	if err := expectResult(t, finished, "FinishFlow"); err != nil {
		t.Fatalf("FinishFlow returned %v", err)
	}
}

// While a flow is closing, nothing hands out its worker.
func TestFinishFlowTakesFlowOutOfService(t *testing.T) {
	worker := newGatedFlowWorker()
	fc := newLifecycleController(&lifecycleQuerier{status: database.FlowStatusWaiting}, &lifecycleDocker{})
	fc.registerForTest(worker)

	finished := runAsync(func() error { return fc.FinishFlow(context.Background(), lifecycleFlowID) })
	waitFor(t, worker.finishEntered, "Finish to start")

	if _, err := fc.GetFlow(context.Background(), lifecycleFlowID); !errors.Is(err, ErrFlowNotFound) {
		t.Errorf("GetFlow on a closing flow returned %v, want ErrFlowNotFound", err)
	}
	if flows := fc.ListFlows(context.Background()); len(flows) != 0 {
		t.Errorf("ListFlows returned %d flows, want the closing flow left out", len(flows))
	}
	if err := fc.StopFlow(context.Background(), lifecycleFlowID); !errors.Is(err, ErrFlowNotLoaded) {
		t.Errorf("StopFlow on a closing flow returned %v, want ErrFlowNotLoaded", err)
	}

	close(worker.finishRelease)
	if err := expectResult(t, finished, "FinishFlow"); err != nil {
		t.Fatalf("FinishFlow returned %v", err)
	}
	if fc.hasSlot(lifecycleFlowID) {
		t.Error("the flow's slot was left in the registry after its finish")
	}
}

// Review fix 1: a second finish during a teardown returns at once and does not
// run Finish again.
func TestSecondFinishDuringTeardownReturnsAtOnce(t *testing.T) {
	worker := newGatedFlowWorker()
	fc := newLifecycleController(&lifecycleQuerier{status: database.FlowStatusWaiting}, &lifecycleDocker{})
	fc.registerForTest(worker)

	first := runAsync(func() error { return fc.FinishFlow(context.Background(), lifecycleFlowID) })
	waitFor(t, worker.finishEntered, "first Finish to start")

	second := runAsync(func() error { return fc.FinishFlow(context.Background(), lifecycleFlowID) })
	if err := expectResult(t, second, "second FinishFlow"); err != nil {
		t.Fatalf("second FinishFlow returned %v, want nil", err)
	}

	close(worker.finishRelease)
	if err := expectResult(t, first, "first FinishFlow"); err != nil {
		t.Fatalf("first FinishFlow returned %v", err)
	}
	if n := worker.finishes.Load(); n != 1 {
		t.Fatalf("worker Finish ran %d times, want 1", n)
	}
}

// Review fix 1: a new assistant refuses a flow being finished instead of joining
// or reopening it.
func TestCreateAssistantRefusesAClosingFlow(t *testing.T) {
	worker := newGatedFlowWorker()
	fc := newLifecycleController(&lifecycleQuerier{status: database.FlowStatusWaiting}, &lifecycleDocker{})
	fc.registerForTest(worker)

	finished := runAsync(func() error { return fc.FinishFlow(context.Background(), lifecycleFlowID) })
	waitFor(t, worker.finishEntered, "Finish to start")

	created := runAsync(func() error {
		_, err := fc.CreateAssistant(context.Background(), 1, lifecycleFlowID, "hi", true, "deepseek", "deepseek", nil, nil)
		return err
	})
	if err := expectResult(t, created, "CreateAssistant"); !errors.Is(err, ErrFlowNotFound) {
		t.Fatalf("CreateAssistant on a closing flow returned %v, want ErrFlowNotFound", err)
	}

	close(worker.finishRelease)
	if err := expectResult(t, finished, "FinishFlow"); err != nil {
		t.Fatalf("FinishFlow returned %v", err)
	}
	if fc.hasSlot(lifecycleFlowID) {
		t.Error("a worker was registered for the finished flow")
	}
}

// A finish waits for a stop already in progress on the same flow.
func TestFinishFlowWaitsForStopInProgress(t *testing.T) {
	worker := newGatedFlowWorker()
	fc := newLifecycleController(&lifecycleQuerier{status: database.FlowStatusWaiting}, &lifecycleDocker{})
	fc.registerForTest(worker)

	stopped := runAsync(func() error { return fc.StopFlow(context.Background(), lifecycleFlowID) })
	waitFor(t, worker.stopEntered, "Stop to start")

	finished := runAsync(func() error { return fc.FinishFlow(context.Background(), lifecycleFlowID) })
	select {
	case <-worker.finishEntered:
		t.Fatal("Finish started while Stop was still running")
	case <-time.After(100 * time.Millisecond):
	}

	close(worker.stopRelease)
	if err := expectResult(t, stopped, "StopFlow"); err != nil {
		t.Fatalf("StopFlow returned %v", err)
	}
	waitFor(t, worker.finishEntered, "Finish to start after Stop")
	close(worker.finishRelease)
	if err := expectResult(t, finished, "FinishFlow"); err != nil {
		t.Fatalf("FinishFlow returned %v", err)
	}
}

func runningContainer(id int64, localID string) database.Container {
	return database.Container{
		ID:      id,
		Status:  database.ContainerStatusRunning,
		LocalID: sql.NullString{String: localID, Valid: true},
	}
}

// Review fix 4 (flow 50 in production): a finish that fails, here a sandbox
// that would not stop, still closes the flow and releases its containers.
func TestFailedFinishStillClosesTheFlow(t *testing.T) {
	worker := newGatedFlowWorker()
	worker.finishErr = errors.New("container shutdown failed")
	close(worker.finishRelease)

	q := &lifecycleQuerier{
		status:     database.FlowStatusRunning,
		containers: []database.Container{runningContainer(7, "abc")},
	}
	d := &lifecycleDocker{}
	fc := newLifecycleController(q, d)
	fc.registerForTest(worker)

	err := fc.FinishFlow(context.Background(), lifecycleFlowID)
	if !errors.Is(err, worker.finishErr) {
		t.Fatalf("FinishFlow returned %v, want the worker's finish error", err)
	}

	status, _, _ := q.snapshot()
	if status != database.FlowStatusFinished {
		t.Errorf("flow status after a failed finish = %s, want finished", status)
	}
	if removed := d.removedIDs(); len(removed) != 1 || removed[0] != "abc" {
		t.Errorf("removed containers = %v, want [abc]", removed)
	}
	if fc.hasSlot(lifecycleFlowID) {
		t.Error("a failed finish left the dead worker registered")
	}
}

// Review fix 5: a worker that never stops cannot hold a finish past its budget,
// and the flow still ends up finished.
func TestFinishFlowIsBoundedByItsBudget(t *testing.T) {
	worker := newGatedFlowWorker()
	worker.honorCtx = true // never released: only the budget ends it

	q := &lifecycleQuerier{status: database.FlowStatusRunning}
	fc := newLifecycleController(q, &lifecycleDocker{})
	fc.registerForTest(worker)

	finished := runAsync(func() error {
		return fc.closeFlow(context.Background(), lifecycleFlowID, 100*time.Millisecond, false)
	})
	err := expectResult(t, finished, "FinishFlow with a stuck worker")
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("FinishFlow returned %v, want the budget's DeadlineExceeded", err)
	}

	if status, _, _ := q.snapshot(); status != database.FlowStatusFinished {
		t.Errorf("flow status after the budget ran out = %s, want finished", status)
	}
	if fc.hasSlot(lifecycleFlowID) {
		t.Error("the stuck flow's slot was not released")
	}
}

// A flow with no worker in memory is still finished: status and containers.
func TestFinishFlowClosesUnloadedFlow(t *testing.T) {
	q := &lifecycleQuerier{
		status: database.FlowStatusWaiting,
		containers: []database.Container{
			runningContainer(7, "abc"),
			{ID: 8, Status: database.ContainerStatusDeleted, LocalID: sql.NullString{String: "gone", Valid: true}},
		},
	}
	d := &lifecycleDocker{}
	fc := newLifecycleController(q, d)

	if err := fc.FinishFlow(context.Background(), lifecycleFlowID); err != nil {
		t.Fatalf("FinishFlow on an unloaded flow returned %v", err)
	}
	if _, _, sets := q.snapshot(); len(sets) != 1 || sets[0] != database.FlowStatusFinished {
		t.Errorf("flow status updates = %v, want [finished]", sets)
	}
	if removed := d.removedIDs(); len(removed) != 1 || removed[0] != "abc" {
		t.Errorf("removed containers = %v, want [abc]", removed)
	}
	if fc.hasSlot(lifecycleFlowID) {
		t.Error("the closing slot of an unloaded flow was left in the registry")
	}
}

// Review fix 3: finishing an unloaded scan child flow updates its scan.
func TestFinishUnloadedScanFlowUpdatesTheScan(t *testing.T) {
	q := &lifecycleQuerier{
		status:       database.FlowStatusRunning,
		domainID:     sql.NullInt64{Int64: 39, Valid: true},
		domainStatus: database.DomainStatusRunning,
	}
	fc := newLifecycleController(q, &lifecycleDocker{})

	if err := fc.FinishFlow(context.Background(), lifecycleFlowID); err != nil {
		t.Fatalf("FinishFlow returned %v", err)
	}

	q.mu.Lock()
	defer q.mu.Unlock()
	if q.domainStatus != database.DomainStatusFinished {
		t.Errorf("scan status = %s (updates %v), want finished", q.domainStatus, q.domainStatusSets)
	}
}

func TestFinishFlowOnMissingFlow(t *testing.T) {
	fc := newLifecycleController(&lifecycleQuerier{missing: true}, &lifecycleDocker{})

	if err := fc.FinishFlow(context.Background(), lifecycleFlowID); !errors.Is(err, ErrFlowNotFound) {
		t.Fatalf("FinishFlow on a missing flow returned %v, want ErrFlowNotFound", err)
	}
}

// DeleteFlow closes the flow and deletes it in one teardown.
func TestDeleteFlowFinishesThroughController(t *testing.T) {
	worker := newGatedFlowWorker()
	close(worker.finishRelease)

	q := &lifecycleQuerier{status: database.FlowStatusWaiting}
	fc := newLifecycleController(q, &lifecycleDocker{})
	fc.registerForTest(worker)

	if err := fc.DeleteFlow(context.Background(), lifecycleFlowID); err != nil {
		t.Fatalf("DeleteFlow returned %v", err)
	}
	if n := worker.finishes.Load(); n != 1 {
		t.Errorf("worker Finish ran %d times, want 1", n)
	}
	if _, deleted, _ := q.snapshot(); !deleted {
		t.Error("DeleteFlow did not delete the flow row")
	}
	if fc.hasSlot(lifecycleFlowID) {
		t.Error("DeleteFlow left the flow in the registry")
	}
}

// Review fix 2: a delete during a finish is carried out by that teardown, before
// its slot is released, and the flow is not finished twice.
func TestDeleteDuringFinishDeletesWhenTheFinishEnds(t *testing.T) {
	worker := newGatedFlowWorker()
	q := &lifecycleQuerier{status: database.FlowStatusWaiting}
	fc := newLifecycleController(q, &lifecycleDocker{})
	fc.registerForTest(worker)

	finished := runAsync(func() error { return fc.FinishFlow(context.Background(), lifecycleFlowID) })
	waitFor(t, worker.finishEntered, "Finish to start")

	deleted := runAsync(func() error { return fc.DeleteFlow(context.Background(), lifecycleFlowID) })
	if err := expectResult(t, deleted, "DeleteFlow"); err != nil {
		t.Fatalf("DeleteFlow during a finish returned %v", err)
	}
	if _, isDeleted, _ := q.snapshot(); isDeleted {
		t.Fatal("the row was deleted before the finish ended")
	}

	close(worker.finishRelease)
	if err := expectResult(t, finished, "FinishFlow"); err != nil {
		t.Fatalf("FinishFlow returned %v", err)
	}
	if _, isDeleted, _ := q.snapshot(); !isDeleted {
		t.Error("the delete asked for during the finish never happened")
	}
	if n := worker.finishes.Load(); n != 1 {
		t.Errorf("worker Finish ran %d times, want 1", n)
	}
}

// Review fix 2: an assistant waiting on a delete in progress must not register a
// worker for the deleted flow.
func TestCreateAssistantWaitingOnDeleteDoesNotReviveTheFlow(t *testing.T) {
	q := &lifecycleQuerier{status: database.FlowStatusFinished, tasksGate: make(chan struct{})}
	fc := newLifecycleController(q, &lifecycleDocker{})

	deleted := runAsync(func() error { return fc.DeleteFlow(context.Background(), lifecycleFlowID) })
	// Wait for the teardown to hold the flow's slot.
	for deadline := time.Now().Add(finishDeadline); !fc.hasSlot(lifecycleFlowID); {
		if time.Now().After(deadline) {
			t.Fatal("DeleteFlow never took the flow's slot")
		}
		time.Sleep(time.Millisecond)
	}

	created := runAsync(func() error {
		_, err := fc.CreateAssistant(context.Background(), 1, lifecycleFlowID, "hi", true, "deepseek", "deepseek", nil, nil)
		return err
	})
	expectPending(t, created, "CreateAssistant during a delete")

	close(q.tasksGate)
	if err := expectResult(t, deleted, "DeleteFlow"); err != nil {
		t.Fatalf("DeleteFlow returned %v", err)
	}
	if err := expectResult(t, created, "CreateAssistant"); !errors.Is(err, ErrFlowNotFound) {
		t.Fatalf("CreateAssistant after the delete returned %v, want ErrFlowNotFound", err)
	}
	if fc.hasSlot(lifecycleFlowID) {
		t.Error("a worker was registered for the deleted flow")
	}
}

// A soft-deleted flow is never reloaded by an assistant request.
func TestCreateAssistantDoesNotReviveADeletedFlow(t *testing.T) {
	q := &lifecycleQuerier{status: database.FlowStatusFinished, deleted: true}
	fc := newLifecycleController(q, &lifecycleDocker{})

	_, err := fc.CreateAssistant(context.Background(), 1, lifecycleFlowID, "hi", true, "deepseek", "deepseek", nil, nil)
	if !errors.Is(err, ErrFlowNotFound) {
		t.Fatalf("CreateAssistant on a deleted flow returned %v, want ErrFlowNotFound", err)
	}
	if _, _, sets := q.snapshot(); len(sets) != 0 {
		t.Errorf("a deleted flow's status was rewritten: %v", sets)
	}
}

// Review item 7: a teardown error does not orphan an already closed flow; the
// delete goes ahead so a scan delete cannot leave child flows behind.
func TestDeleteClosedFlowSurvivesTeardownError(t *testing.T) {
	q := &lifecycleQuerier{status: database.FlowStatusFinished, tasksErr: errors.New("db hiccup")}
	fc := newLifecycleController(q, &lifecycleDocker{})

	if err := fc.DeleteFlow(context.Background(), lifecycleFlowID); err != nil {
		t.Fatalf("DeleteFlow of a closed flow returned %v, want nil", err)
	}
	if _, deleted, _ := q.snapshot(); !deleted {
		t.Error("the closed flow was not deleted after a teardown error")
	}
}

// A flow that could not be closed is kept, so its delete can be retried.
func TestDeleteOpenFlowKeepsRowOnTeardownError(t *testing.T) {
	q := &lifecycleQuerier{status: database.FlowStatusWaiting, tasksErr: errors.New("db hiccup")}
	fc := newLifecycleController(q, &lifecycleDocker{})

	if err := fc.DeleteFlow(context.Background(), lifecycleFlowID); err == nil {
		t.Fatal("DeleteFlow of a flow that could not be closed returned nil")
	}
	if _, deleted, _ := q.snapshot(); deleted {
		t.Error("an open flow was deleted although its teardown failed")
	}
}

// Review item 8: "not loaded" and "does not exist" are told apart.
func TestStopFlowTellsNotLoadedFromMissing(t *testing.T) {
	fc := newLifecycleController(&lifecycleQuerier{status: database.FlowStatusWaiting}, &lifecycleDocker{})
	if err := fc.StopFlow(context.Background(), lifecycleFlowID); !errors.Is(err, ErrFlowNotLoaded) {
		t.Errorf("StopFlow on an unloaded flow returned %v, want ErrFlowNotLoaded", err)
	}

	fc = newLifecycleController(&lifecycleQuerier{missing: true}, &lifecycleDocker{})
	if err := fc.StopFlow(context.Background(), lifecycleFlowID); !errors.Is(err, ErrFlowNotFound) {
		t.Errorf("StopFlow on a missing flow returned %v, want ErrFlowNotFound", err)
	}
}
