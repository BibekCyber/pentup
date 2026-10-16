package providers

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/vxcontrol/langchaingo/llms"
	"github.com/vxcontrol/langchaingo/llms/reasoning"
)

var vendorStatusPattern = regexp.MustCompile(`API returned unexpected status code: (\d{3})`)

// isDeterministicError reports whether the same request with the same options
// can only fail the same way again.
func isDeterministicError(err error) bool {
	if err == nil {
		return false
	}

	return isLocalRefusal(err) || llms.IsContentFilterError(err) || isRejectedRequestStatus(err) || isExhaustedQuota(err)
}

// isLocalRefusal reports whether the library decided the request cannot succeed
// before it reached the network.
func isLocalRefusal(err error) bool {
	var (
		structuredUnsupported *llms.ErrStructuredOutputUnsupported
		structuredConflict    *llms.ErrStructuredOutputConflict
		reasoningOff          *reasoning.ErrReasoningOffUnsupported
		forcedToolUse         *reasoning.ErrForcedToolUseWithThinking
		assistantPrefill      *reasoning.ErrAssistantPrefillUnsupported
		effortHasNoBudget     *reasoning.ErrEffortHasNoBudget
		effortWithTools       *reasoning.ErrEffortWithTools
		budgetUnsupported     *reasoning.ErrThinkingBudgetUnsupported
		thinkingNeedsStream   *reasoning.ErrThinkingRequiresStream
	)

	return errors.As(err, &structuredUnsupported) ||
		errors.As(err, &structuredConflict) ||
		errors.As(err, &reasoningOff) ||
		errors.As(err, &forcedToolUse) ||
		errors.As(err, &assistantPrefill) ||
		errors.As(err, &effortHasNoBudget) ||
		errors.As(err, &effortWithTools) ||
		errors.As(err, &budgetUnsupported) ||
		errors.As(err, &thinkingNeedsStream) ||
		errors.Is(err, llms.ErrStructuredOutputConfig)
}

func isRejectedRequestStatus(err error) bool {
	match := vendorStatusPattern.FindStringSubmatch(err.Error())
	if match == nil {
		return false
	}

	status, convErr := strconv.Atoi(match[1])
	if convErr != nil {
		return false
	}

	switch status {
	case http.StatusRequestTimeout, http.StatusTooManyRequests:
		return false
	default:
		return status >= 400 && status < 500
	}
}

// Unlike a temporary rate limit, an exhausted balance cannot recover by retrying
// the same request. Keep ordinary 429s retryable; match explicit provider diagnostics.
func isExhaustedQuota(err error) bool {
	message := strings.ToLower(err.Error())
	return strings.Contains(message, "insufficient balance") ||
		strings.Contains(message, "insufficient_quota") ||
		strings.Contains(message, "exceeded_current_quota_error")
}

func retryTransient[T any](ctx context.Context, delay time.Duration, call func() (T, error)) (T, error) {
	var zero T
	for attempt := 1; ; attempt++ {
		if err := ctx.Err(); err != nil {
			return zero, err
		}
		result, err := call()
		switch {
		case err == nil:
			return result, nil
		case ctx.Err() != nil:
			return zero, ctx.Err()
		case errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) || isDeterministicError(err):
			return zero, err
		case attempt == maxRetriesToCallSimpleChain:
			return zero, fmt.Errorf("gave up after %d attempts: %w", attempt, err)
		}

		select {
		case <-ctx.Done():
			return zero, ctx.Err()
		case <-time.After(delay):
		}
	}
}
