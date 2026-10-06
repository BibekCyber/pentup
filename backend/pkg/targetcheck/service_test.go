package targetcheck

import (
	"context"
	"errors"
	"io"
	"testing"

	"pentagi/pkg/config"

	"github.com/sirupsen/logrus"
)

func testLogger() *logrus.Entry {
	l := logrus.New()
	l.SetOutput(io.Discard)
	return l.WithField("component", "test")
}

func baseConfig() *config.Config {
	return &config.Config{
		TargetCheckEnabled:             true,
		TargetCheckEnforce:             true,
		TargetCheckRateBurst:           5,
		TargetCheckRateIntervalSeconds: 1,
	}
}

func TestServiceRateLimits(t *testing.T) {
	cfg := baseConfig()
	cfg.TargetCheckEnabled = false // no network access in this test
	cfg.TargetCheckRateBurst = 2
	svc := NewService(cfg, testLogger())

	for i := range 2 {
		if _, err := svc.Check(context.Background(), 7, "acme.com"); err != nil {
			t.Fatalf("check %d failed: %v", i+1, err)
		}
	}

	_, err := svc.Check(context.Background(), 7, "acme.com")
	var limited *ErrRateLimited
	if !errors.As(err, &limited) {
		t.Fatalf("err = %v, want *ErrRateLimited", err)
	}
	if limited.RetryAfter <= 0 {
		t.Error("RetryAfter should be positive")
	}
}

// With probing disabled the service still rejects malformed and off-limits
// targets, it just never touches the network.
func TestServiceDisabledStillValidates(t *testing.T) {
	cfg := baseConfig()
	cfg.TargetCheckEnabled = false
	svc := NewService(cfg, testLogger())

	for _, tc := range []struct {
		target string
		ok     bool
	}{
		{"sjhfga", false},
		{"169.254.169.254", false},
		{"acme.com", true},
		{"https://api.acme.com/v1", true},
		{"123456789012", true},
	} {
		res, err := svc.Check(context.Background(), 1, tc.target)
		if err != nil {
			t.Fatalf("Check(%q): %v", tc.target, err)
		}
		if res.OK != tc.ok {
			t.Errorf("Check(%q).OK = %v, want %v (%s)", tc.target, res.OK, tc.ok, res.Message)
		}
	}
}

func TestServiceEnforced(t *testing.T) {
	cfg := baseConfig()
	if !NewService(cfg, testLogger()).Enforced() {
		t.Error("Enforced() should follow TargetCheckEnforce")
	}
	cfg.TargetCheckEnforce = false
	if NewService(cfg, testLogger()).Enforced() {
		t.Error("Enforced() should be false when disabled")
	}
	var nilService *Service
	if nilService.Enforced() {
		t.Error("a nil service must not be enforced")
	}
}

func TestServiceAppliesAllowPrivate(t *testing.T) {
	cfg := baseConfig()
	cfg.TargetCheckEnabled = false
	cfg.TargetCheckAllowPrivate = true
	svc := NewService(cfg, testLogger())

	if res := svc.Validate("10.1.2.3"); !res.OK {
		t.Errorf("AllowPrivate should permit 10.1.2.3: %s", res.Message)
	}
	// Metadata stays blocked regardless.
	if res := svc.Validate("169.254.169.254"); res.OK {
		t.Error("metadata must stay blocked even with AllowPrivate")
	}
}

func TestServiceIgnoresInvalidDenyCIDR(t *testing.T) {
	cfg := baseConfig()
	cfg.TargetCheckEnabled = false
	cfg.TargetCheckDenyCIDRs = []string{"not-a-cidr", "203.0.114.0/24"}
	svc := NewService(cfg, testLogger())

	if res := svc.Validate("203.0.114.9"); res.OK {
		t.Error("the valid denylist entry should still apply")
	}
	if res := svc.Validate("8.8.8.8"); !res.OK {
		t.Error("an invalid entry must not block unrelated targets")
	}
}
