package subscriptions

import (
	"context"
	"testing"
	"time"
)

// withSendTimeout temporarily lowers defSendTimeout for fast, deterministic
// tests and restores it afterwards.
func withSendTimeout(t *testing.T, d time.Duration) {
	t.Helper()
	prev := defSendTimeout
	defSendTimeout = d
	t.Cleanup(func() { defSendTimeout = prev })
}

// TestChannelPublishDelivers verifies the basic happy path: a subscriber
// receives a value published to its id.
func TestChannelPublishDelivers(t *testing.T) {
	ch := NewChannel[int]()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sub := ch.Subscribe(ctx, 1)
	ch.Publish(context.Background(), 1, 42)

	select {
	case got := <-sub:
		if got != 42 {
			t.Fatalf("got %d, want 42", got)
		}
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for published value")
	}
}

// TestChannelPublishDropsStalledSubscriber is the regression test for the
// hung-scan deadlock. A subscriber that never drains its buffer must not block
// the publisher: the send to it times out and is dropped, and a healthy
// subscriber still receives the event.
func TestChannelPublishDropsStalledSubscriber(t *testing.T) {
	withSendTimeout(t, 50*time.Millisecond)

	ch := NewChannel[int]()

	// Stalled subscriber (index 0): subscribed but never read from.
	stalledCtx, stalledCancel := context.WithCancel(context.Background())
	defer stalledCancel()
	_ = ch.Subscribe(stalledCtx, 1)

	// Healthy subscriber (index 1): continuously drained.
	healthyCtx, healthyCancel := context.WithCancel(context.Background())
	defer healthyCancel()
	healthy := ch.Subscribe(healthyCtx, 1)

	got := make(chan int, 4*defChannelLen)
	go func() {
		for v := range healthy {
			got <- v
		}
	}()

	// Fill the stalled subscriber's buffer so the next send to it would block.
	for i := 0; i < defChannelLen; i++ {
		ch.Publish(context.Background(), 1, i)
	}

	// This publish must not hang: the send to the stalled subscriber times out
	// and is dropped, while the healthy subscriber still receives the marker.
	const marker = 999999
	done := make(chan struct{})
	start := time.Now()
	go func() {
		ch.Publish(context.Background(), 1, marker)
		close(done)
	}()

	select {
	case <-done:
		if elapsed := time.Since(start); elapsed > 2*time.Second {
			t.Fatalf("Publish took %v — should return shortly after the send timeout", elapsed)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("Publish blocked on a stalled subscriber (deadlock not fixed)")
	}

	deadline := time.After(2 * time.Second)
	for {
		select {
		case v := <-got:
			if v == marker {
				return // healthy subscriber received the event despite the stalled peer
			}
		case <-deadline:
			t.Fatal("healthy subscriber never received the marker event")
		}
	}
}

// TestBroadcastDropsStalledSubscriber verifies the same non-blocking guarantee
// for Broadcast, which fans out to every subscriber across all ids.
func TestBroadcastDropsStalledSubscriber(t *testing.T) {
	withSendTimeout(t, 50*time.Millisecond)

	ch := NewChannel[int]()

	stalledCtx, stalledCancel := context.WithCancel(context.Background())
	defer stalledCancel()
	_ = ch.Subscribe(stalledCtx, 1)

	// Fill the stalled subscriber's buffer via broadcasts.
	for i := 0; i < defChannelLen; i++ {
		ch.Broadcast(context.Background(), i)
	}

	done := make(chan struct{})
	go func() {
		ch.Broadcast(context.Background(), 999999)
		close(done)
	}()

	select {
	case <-done:
	case <-time.After(3 * time.Second):
		t.Fatal("Broadcast blocked on a stalled subscriber (deadlock not fixed)")
	}
}
