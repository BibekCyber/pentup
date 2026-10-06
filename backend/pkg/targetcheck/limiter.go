package targetcheck

import (
	"sync"
	"time"
)

// Limiter caps how often one user may run a check, so the endpoint cannot be
// turned into a probing tool pointed at third parties through this server.
// It is a token bucket: Burst checks back to back, then one per Interval.
type Limiter struct {
	burst    float64
	interval time.Duration
	ttl      time.Duration

	mu      sync.Mutex
	buckets map[int64]*bucket
	now     func() time.Time
}

type bucket struct {
	tokens float64
	seen   time.Time
}

// NewLimiter returns a limiter allowing burst checks immediately and one more
// every interval. A zero burst or interval disables limiting.
func NewLimiter(burst int, interval time.Duration) *Limiter {
	return &Limiter{
		burst:    float64(burst),
		interval: interval,
		ttl:      10 * time.Minute,
		buckets:  make(map[int64]*bucket),
		now:      time.Now,
	}
}

// Allow consumes one token for userID, reporting whether the check may run and
// how long until the next one is available.
func (l *Limiter) Allow(userID int64) (bool, time.Duration) {
	if l == nil || l.burst <= 0 || l.interval <= 0 {
		return true, 0
	}

	l.mu.Lock()
	defer l.mu.Unlock()

	now := l.now()
	b, ok := l.buckets[userID]
	if !ok {
		if len(l.buckets) > 0 {
			l.evictLocked(now)
		}
		b = &bucket{tokens: l.burst}
		l.buckets[userID] = b
	} else {
		b.tokens += now.Sub(b.seen).Seconds() / l.interval.Seconds()
		if b.tokens > l.burst {
			b.tokens = l.burst
		}
	}
	b.seen = now

	if b.tokens < 1 {
		return false, time.Duration((1 - b.tokens) * float64(l.interval))
	}
	b.tokens--
	return true, 0
}

// evictLocked drops buckets untouched for longer than the TTL, which are back
// to full and so indistinguishable from a new one.
func (l *Limiter) evictLocked(now time.Time) {
	for id, b := range l.buckets {
		if now.Sub(b.seen) > l.ttl {
			delete(l.buckets, id)
		}
	}
}
