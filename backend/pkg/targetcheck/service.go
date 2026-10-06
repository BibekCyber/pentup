package targetcheck

import (
	"context"
	"fmt"
	"net/netip"
	"time"

	"pentagi/pkg/config"

	"github.com/sirupsen/logrus"
)

// ErrRateLimited is returned when a user runs checks too quickly.
type ErrRateLimited struct{ RetryAfter time.Duration }

func (e *ErrRateLimited) Error() string {
	return fmt.Sprintf("too many target checks; try again in %s", e.RetryAfter.Round(time.Second))
}

// Service is the application-facing entry point: one rate-limited, audited
// target check per user.
type Service struct {
	checker *Checker
	limiter *Limiter
	logger  *logrus.Entry

	// enabled turns the probe off, leaving format and policy validation.
	enabled bool
	// enforce repeats the check inside createScan.
	enforce bool
}

// NewService builds the target checker from configuration.
func NewService(cfg *config.Config, logger *logrus.Entry) *Service {
	policy := Policy{AllowPrivate: cfg.TargetCheckAllowPrivate}
	for _, raw := range cfg.TargetCheckDenyCIDRs {
		prefix, err := netip.ParsePrefix(raw)
		if err != nil {
			logger.WithError(err).Warnf("ignoring invalid TARGET_CHECK_DENY_CIDRS entry %q", raw)
			continue
		}
		policy.Deny = append(policy.Deny, prefix)
	}

	interval := time.Duration(cfg.TargetCheckRateIntervalSeconds) * time.Second

	return &Service{
		checker: NewChecker(Options{Policy: policy, UserAgent: cfg.DomainReconUserAgent}),
		limiter: NewLimiter(cfg.TargetCheckRateBurst, interval),
		logger:  logger,
		enabled: cfg.TargetCheckEnabled,
		enforce: cfg.TargetCheckEnforce,
	}
}

// Enforced reports whether createScan should reject a target the check fails.
func (s *Service) Enforced() bool { return s != nil && s.enforce }

// Check validates and probes target on behalf of userID. It returns
// *ErrRateLimited when the user's budget is spent; every other outcome is a
// Result, including rejections.
func (s *Service) Check(ctx context.Context, userID int64, target string) (Result, error) {
	if ok, retry := s.limiter.Allow(userID); !ok {
		return Result{}, &ErrRateLimited{RetryAfter: retry}
	}

	res := s.run(ctx, target)

	// Audit who probed what: the endpoint reaches third-party infrastructure,
	// so the trail matters if a target owner ever asks.
	s.logger.WithFields(logrus.Fields{
		"uid":     userID,
		"target":  res.Input,
		"host":    res.Host,
		"outcome": res.Outcome,
		"ok":      res.OK,
	}).Info("target check")

	return res, nil
}

func (s *Service) run(ctx context.Context, target string) Result {
	if !s.enabled {
		// Probing is off: validate the format and the address policy only.
		return s.checker.validator.Validate(target)
	}
	return s.checker.Check(ctx, target)
}

// Validate applies format and policy checks without touching the network. It
// is the cheap gate createScan uses before the full check.
func (s *Service) Validate(target string) Result {
	return s.checker.validator.Validate(target)
}
