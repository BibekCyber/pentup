package controller

import (
	"context"
	"errors"
	"io"
	"sync"
	"testing"
	"time"

	"pentagi/pkg/database"
	"pentagi/pkg/graph/subscriptions"
	"pentagi/pkg/providers"

	"github.com/sirupsen/logrus"
)

// Regression tests for the production hang of 2026-11-10: finishing a flow while
// its assistant was mid-turn left FinishFlow blocked forever inside fc.mx, which
// in turn blocked every create/send/stop/finish on the server.

const finishDeadline = 2 * time.Second

// iterations covers the select race: before the fix each run hung with ~50%
// probability, so a broken build fails this loop practically every time.
const finishIterations = 50

type stubAssistantQuerier struct {
	database.Querier
}

func (stubAssistantQuerier) UpdateAssistantUseAgents(ctx context.Context, arg database.UpdateAssistantUseAgentsParams) (database.Assistant, error) {
	if err := ctx.Err(); err != nil {
		return database.Assistant{}, err
	}
	return database.Assistant{ID: arg.ID}, nil
}

func (stubAssistantQuerier) UpdateAssistantStatus(ctx context.Context, arg database.UpdateAssistantStatusParams) (database.Assistant, error) {
	return database.Assistant{ID: arg.ID, Status: arg.Status}, nil
}

type stubAssistantPublisher struct {
	subscriptions.FlowPublisher
}

func (stubAssistantPublisher) AssistantUpdated(context.Context, database.Assistant) {}

type stubAssistantLog struct {
	FlowAssistantLogWorker
}

func (stubAssistantLog) PutFlowAssistantMsg(context.Context, database.MsglogType, string, string) (int64, error) {
	return 1, nil
}

// blockingAssistantProvider keeps the turn running until the assistant is
// cancelled, like a long LLM call or findings extraction in production.
type blockingAssistantProvider struct {
	providers.AssistantProvider
	started chan struct{}
}

func (p *blockingAssistantProvider) PutInputToAgentChain(context.Context, string) error { return nil }

func (p *blockingAssistantProvider) PerformAgentChain(ctx context.Context) error {
	close(p.started)
	<-ctx.Done()
	return ctx.Err()
}

func (p *blockingAssistantProvider) EnsureChainConsistency(context.Context) error { return nil }

func testLogger() *logrus.Entry {
	logger := logrus.New()
	logger.SetOutput(io.Discard)
	return logrus.NewEntry(logger)
}

func newTestAssistantWorker(ap providers.AssistantProvider) *assistantWorker {
	ctx, cancel := context.WithCancel(context.Background())
	return &assistantWorker{
		id:     12,
		flowID: 51,
		aslw:   stubAssistantLog{},
		ap:     ap,
		db:     stubAssistantQuerier{},
		wg:     &sync.WaitGroup{},
		pub:    stubAssistantPublisher{},
		ctx:    ctx,
		cancel: cancel,
		runMX:  &sync.Mutex{},
		runST:  func() {},
		runWG:  &sync.WaitGroup{},
		input:  make(chan assistantInput),
		logger: testLogger(),
	}
}

func TestAssistantFinishDuringTurnDoesNotHang(t *testing.T) {
	for i := 0; i < finishIterations; i++ {
		ap := &blockingAssistantProvider{started: make(chan struct{})}
		aw := newTestAssistantWorker(ap)

		aw.wg.Add(1)
		go aw.worker()

		go func() { _ = aw.PutInput(context.Background(), "scan it", true) }()

		select {
		case <-ap.started:
		case <-time.After(finishDeadline):
			t.Fatalf("iteration %d: assistant turn never started", i)
		}

		finished := make(chan error, 1)
		go func() { finished <- aw.Finish(context.Background()) }()

		select {
		case err := <-finished:
			if err != nil {
				t.Fatalf("iteration %d: Finish returned error: %v", i, err)
			}
		case <-time.After(finishDeadline):
			t.Fatalf("iteration %d: Finish hung while the assistant was mid-turn", i)
		}
	}
}

type stubTaskController struct {
	TaskController
}

func (stubTaskController) ListTasks(context.Context) []TaskWorker { return nil }

func newTestFlowWorker() *flowWorker {
	ctx, cancel := context.WithCancel(context.Background())
	return &flowWorker{
		tc:      stubTaskController{},
		wg:      &sync.WaitGroup{},
		aws:     map[int64]AssistantWorker{},
		awsMX:   &sync.Mutex{},
		ctx:     ctx,
		cancel:  cancel,
		taskMX:  &sync.Mutex{},
		taskST:  func() {},
		taskWG:  &sync.WaitGroup{},
		input:   make(chan flowInput),
		flowCtx: &FlowContext{FlowID: 50},
		logger:  testLogger(),
	}
}

func TestFlowWorkerExitsOnFinish(t *testing.T) {
	fw := newTestFlowWorker()
	fw.wg.Add(1)
	go fw.worker()

	finished := make(chan error, 1)
	go func() { finished <- fw.finish(context.Background()) }()

	select {
	case err := <-finished:
		if err != nil {
			t.Fatalf("finish returned error: %v", err)
		}
	case <-time.After(finishDeadline):
		t.Fatal("flow worker did not exit after finish")
	}
}

// Flow 50 in production: a message sent after Finish panicked with
// "send on closed channel" because finish closed fw.input.
func TestFlowPutInputAfterFinishDoesNotPanic(t *testing.T) {
	for i := 0; i < finishIterations; i++ {
		fw := newTestFlowWorker()
		if err := fw.finish(context.Background()); err != nil {
			t.Fatalf("finish returned error: %v", err)
		}

		func() {
			defer func() {
				if r := recover(); r != nil {
					t.Fatalf("iteration %d: PutInput panicked after finish: %v", i, r)
				}
			}()
			if err := fw.PutInput(context.Background(), "hello", nil); err == nil {
				t.Fatalf("iteration %d: PutInput on a finished flow should return an error", i)
			}
		}()
	}
}

// A worker goroutine that never exits must not hold a finish forever: the wait
// gives up when the finish budget runs out.
func TestFlowWorkerFinishIsBoundedByContext(t *testing.T) {
	fw := newTestFlowWorker()
	fw.wg.Add(1) // a worker that never exits

	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	finished := make(chan error, 1)
	go func() { finished <- fw.finish(ctx) }()

	select {
	case err := <-finished:
		if !errors.Is(err, context.DeadlineExceeded) {
			t.Fatalf("finish returned %v, want DeadlineExceeded", err)
		}
	case <-time.After(finishDeadline):
		t.Fatal("finish ignored its context and waited on a stuck worker")
	}
}

func TestAssistantFinishIsBoundedByContext(t *testing.T) {
	aw := newTestAssistantWorker(&blockingAssistantProvider{started: make(chan struct{})})
	aw.wg.Add(1) // a worker that never exits

	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	finished := make(chan error, 1)
	go func() { finished <- aw.Finish(ctx) }()

	select {
	case err := <-finished:
		if !errors.Is(err, context.DeadlineExceeded) {
			t.Fatalf("Finish returned %v, want DeadlineExceeded", err)
		}
	case <-time.After(finishDeadline):
		t.Fatal("Finish ignored its context and waited on a stuck worker")
	}
}
