package controller

import "fmt"

// Quota identifiers carried by QuotaError so callers (e.g. GraphQL resolvers)
// can tell which guardrail was hit and render the right user-facing message.
const (
	QuotaFlows   = "flows"
	QuotaDomains = "domains"
)

// QuotaError is returned when a hard per-user concurrency guardrail is hit. It
// is a distinct type so the transport layer can surface a structured error code
// (e.g. GraphQL extensions.code = "QUOTA_EXCEEDED") instead of a generic failure.
type QuotaError struct {
	Quota   string
	Current int
	Max     int
}

func (e *QuotaError) Error() string {
	switch e.Quota {
	case QuotaFlows:
		return fmt.Sprintf(
			"you have %d active flows (limit %d); wait for one to finish or stop one",
			e.Current, e.Max,
		)
	case QuotaDomains:
		return fmt.Sprintf(
			"you have %d active domain scans (limit %d); wait for one to finish",
			e.Current, e.Max,
		)
	default:
		return fmt.Sprintf("quota '%s' exceeded (%d/%d)", e.Quota, e.Current, e.Max)
	}
}
