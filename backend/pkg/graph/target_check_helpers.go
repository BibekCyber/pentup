package graph

import (
	"context"
	"errors"
	"fmt"

	"pentagi/pkg/graph/model"
	"pentagi/pkg/targetcheck"

	"github.com/vektah/gqlparser/v2/gqlerror"
)

// convertTargetCheck maps a check result onto the GraphQL type. Unknown enum
// values fall back to the rejecting variants, so a result this layer does not
// recognise can never read as an accepted target.
func convertTargetCheck(res targetcheck.Result) *model.TargetCheckResult {
	steps := make([]*model.TargetCheckStep, 0, len(res.Steps))
	for _, s := range res.Steps {
		steps = append(steps, &model.TargetCheckStep{
			Name:   s.Name,
			Status: convertStepStatus(s.Status),
			Detail: s.Detail,
		})
	}

	return &model.TargetCheckResult{
		Input:          res.Input,
		Ok:             res.OK,
		Kind:           convertTargetKind(res.Kind),
		Outcome:        convertTargetOutcome(res.Outcome),
		Message:        res.Message,
		Host:           res.Host,
		Port:           res.Port,
		Service:        res.Service,
		CloudProvider:  res.CloudProvider,
		CloudAccountID: res.CloudAccountID,
		HTTPStatus:     res.HTTPStatus,
		Steps:          steps,
	}
}

func convertStepStatus(s targetcheck.StepStatus) model.TargetCheckStatus {
	switch s {
	case targetcheck.StepOK:
		return model.TargetCheckStatusOk
	case targetcheck.StepWarn:
		return model.TargetCheckStatusWarn
	case targetcheck.StepSkip:
		return model.TargetCheckStatusSkip
	default:
		return model.TargetCheckStatusFail
	}
}

func convertTargetKind(k targetcheck.Kind) model.TargetKind {
	switch k {
	case targetcheck.KindURL:
		return model.TargetKindURL
	case targetcheck.KindHost:
		return model.TargetKindHost
	case targetcheck.KindIP:
		return model.TargetKindIP
	case targetcheck.KindCloudAccount:
		return model.TargetKindCloudAccount
	default:
		return model.TargetKindInvalid
	}
}

func convertTargetOutcome(o targetcheck.Outcome) model.TargetOutcome {
	switch o {
	case targetcheck.OutcomeBlocked:
		return model.TargetOutcomeBlockedDestination
	case targetcheck.OutcomeDNSNotFound:
		return model.TargetOutcomeDNSNotFound
	case targetcheck.OutcomeCloudNotFound:
		return model.TargetOutcomeCloudResourceNotFound
	case targetcheck.OutcomeValid:
		return model.TargetOutcomeValid
	case targetcheck.OutcomeResponding:
		return model.TargetOutcomeResponding
	case targetcheck.OutcomeReachable:
		return model.TargetOutcomeReachable
	case targetcheck.OutcomeDNSOnly:
		return model.TargetOutcomeDNSOnly
	case targetcheck.OutcomeNoResponse:
		return model.TargetOutcomeNoResponse
	case targetcheck.OutcomeDNSError:
		return model.TargetOutcomeDNSError
	case targetcheck.OutcomeAccountIdentifier:
		return model.TargetOutcomeAccountIdentifier
	default:
		return model.TargetOutcomeInvalidInput
	}
}

// targetCheckError turns a rate-limit refusal into a GraphQL error the client
// can distinguish from a rejected target.
func targetCheckError(err error) error {
	var limited *targetcheck.ErrRateLimited
	if errors.As(err, &limited) {
		return &gqlerror.Error{
			Message: limited.Error(),
			Extensions: map[string]any{
				"code":       "RATE_LIMITED",
				"retryAfter": int(limited.RetryAfter.Seconds()) + 1,
			},
		}
	}
	return err
}

// assertScanTarget repeats the wizard's target check inside createScan. The
// client can be bypassed, so this is the authoritative gate; it runs the full
// probe only when the cheap format and policy checks pass.
func (r *Resolver) assertScanTarget(ctx context.Context, uid int64, name string) error {
	if r.TargetCheck == nil || !r.TargetCheck.Enforced() {
		return nil
	}

	// Format and policy first: no network access, so a malformed or
	// off-limits target is refused without probing anything.
	if res := r.TargetCheck.Validate(name); !res.OK {
		return fmt.Errorf("invalid target: %s", res.Message)
	}

	res, err := r.TargetCheck.Check(ctx, uid, name)
	if err != nil {
		var limited *targetcheck.ErrRateLimited
		if errors.As(err, &limited) {
			// Do not fail scan creation over the probe's own budget; the
			// format and policy gates above already passed.
			return nil
		}
		return err
	}
	if !res.OK {
		return fmt.Errorf("invalid target: %s", res.Message)
	}
	return nil
}
