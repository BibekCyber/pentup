package targetcheck

import (
	"testing"
	"time"
)

func TestLimiterBurstThenRefill(t *testing.T) {
	l := NewLimiter(3, time.Second)
	now := time.Now()
	l.now = func() time.Time { return now }

	for i := range 3 {
		if ok, _ := l.Allow(1); !ok {
			t.Fatalf("check %d within the burst was refused", i+1)
		}
	}

	ok, retry := l.Allow(1)
	if ok {
		t.Fatal("the fourth check should be refused")
	}
	if retry <= 0 || retry > time.Second {
		t.Errorf("RetryAfter = %s, want (0, 1s]", retry)
	}

	now = now.Add(time.Second)
	if ok, _ := l.Allow(1); !ok {
		t.Error("a token should have refilled after the interval")
	}
}

func TestLimiterIsPerUser(t *testing.T) {
	l := NewLimiter(1, time.Second)
	if ok, _ := l.Allow(1); !ok {
		t.Fatal("user 1 should be allowed")
	}
	if ok, _ := l.Allow(1); ok {
		t.Fatal("user 1 should be out of budget")
	}
	if ok, _ := l.Allow(2); !ok {
		t.Error("user 2 has their own budget")
	}
}

func TestLimiterDisabled(t *testing.T) {
	for _, l := range []*Limiter{NewLimiter(0, time.Second), NewLimiter(5, 0), nil} {
		for range 50 {
			if ok, _ := l.Allow(1); !ok {
				t.Fatal("a disabled limiter must allow everything")
			}
		}
	}
}

func TestLimiterDoesNotExceedBurstAfterIdle(t *testing.T) {
	l := NewLimiter(2, time.Second)
	now := time.Now()
	l.now = func() time.Time { return now }

	l.Allow(1)
	now = now.Add(time.Hour) // long idle: tokens must cap at the burst

	if ok, _ := l.Allow(1); !ok {
		t.Fatal("first check after idle should be allowed")
	}
	if ok, _ := l.Allow(1); !ok {
		t.Fatal("second check after idle should be allowed")
	}
	if ok, _ := l.Allow(1); ok {
		t.Error("tokens accumulated past the burst")
	}
}
