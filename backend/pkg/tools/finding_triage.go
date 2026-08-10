package tools

import "strings"

// PreserveSeverityOverrides carries analyst re-ratings from a previously stored set of
// findings onto a freshly generated one.
//
// The reporter regenerates findings wholesale and the result replaces the stored array, so
// without this an analyst's triage decision is silently destroyed the next time a report is
// regenerated — the edit simply disappears from a report someone is about to issue.
//
// Findings are matched by normalised title rather than position, because regeneration
// reorders and renumbers them. A finding the reporter has since retitled will not match and
// keeps its freshly generated severity: that fails toward the model's current assessment
// rather than silently reapplying a rating to something that may have changed meaning.
func PreserveSeverityOverrides(previous, current []Finding) []Finding {
	if len(previous) == 0 || len(current) == 0 {
		return current
	}

	overrides := make(map[string]Finding, len(previous))
	for _, finding := range previous {
		if !finding.SeverityUpdated {
			continue
		}

		if key := FindingKey(finding.Title); key != "" {
			overrides[key] = finding
		}
	}

	if len(overrides) == 0 {
		return current
	}

	for i := range current {
		override, ok := overrides[FindingKey(current[i].Title)]
		if !ok {
			continue
		}

		// Keep the regenerated evidence, description and remediation — only the analyst's
		// rating decision is carried across.
		//
		// The "original" pair must describe ONE assessment. The regenerated finding carries
		// the model's current severity and CVSS, so both are captured from it; taking the
		// severity from the old override while refreshing the score from the new run would
		// pair a stale rating with a fresh number, and resetting would then restore a
		// severity and CVSS that contradict the report's own band table.
		regeneratedSeverity := NormaliseSeverity(current[i].Severity)
		regeneratedCVSS := current[i].CVSS

		// The model now agrees with the analyst, so there is nothing left to override.
		// Carrying the flag anyway would show a permanent "adjusted" label on a finding
		// whose reset does nothing, and would keep its CVSS hidden for good.
		if NormaliseSeverity(override.Severity) == regeneratedSeverity {
			current[i].SeverityUpdated = false
			current[i].OriginalSeverity = ""
			current[i].OriginalCVSS = nil

			continue
		}

		rescored := DefaultScoreFor(override.Severity)

		current[i].Severity = override.Severity
		current[i].SeverityUpdated = true
		current[i].OriginalSeverity = regeneratedSeverity
		current[i].OriginalCVSS = regeneratedCVSS
		current[i].CVSS = &rescored
	}

	return current
}

// NormaliseSeverity lower-cases a severity and coerces anything outside the enum to the
// same fallback the report renders. Nothing validates what the model writes, so an
// unrecognised value must never be recorded as an "original": the UI can only offer the
// five valid ratings back, and an original it cannot offer is an override that can never
// be undone.
func NormaliseSeverity(severity string) string {
	switch normalised := strings.ToLower(strings.TrimSpace(severity)); normalised {
	case "critical", "high", "medium", "low", "informational":
		return normalised
	default:
		return "informational"
	}
}

// SeverityBand is the CVSS v3.1 range a severity denotes. These are the same ranges the
// report's appendix publishes to the client, so a stored score outside its severity's band
// visibly contradicts the document.
type SeverityBand struct {
	Min float64
	Max float64
}

var severityBands = map[string]SeverityBand{
	"critical":      {Min: 9.0, Max: 10.0},
	"high":          {Min: 7.0, Max: 8.9},
	"medium":        {Min: 4.0, Max: 6.9},
	"low":           {Min: 0.1, Max: 3.9},
	"informational": {Min: 0.0, Max: 0.0},
}

// BandFor returns the CVSS range for a severity.
func BandFor(severity string) SeverityBand {
	return severityBands[NormaliseSeverity(severity)]
}

// DefaultScoreFor is the score assigned when an analyst re-rates a finding: the top of the
// new band. It is a starting point the analyst can then adjust within the band — the report
// shows a score a human stands behind rather than one recalculated from a vector nobody ran.
func DefaultScoreFor(severity string) float64 {
	return BandFor(severity).Max
}

// FindingKey normalises a finding title for identity comparison: findings have no id, so
// the title is what identifies them across a regeneration or between page load and edit.
func FindingKey(title string) string {
	return strings.Join(strings.Fields(strings.ToLower(title)), " ")
}

// StripAnalystFields clears the triage fields on model-produced findings.
//
// `jsonschema:"-"` keeps these out of the report_result tool schema so the model is never
// told they exist, but the json tags stay live: if a model emitted them anyway — copying a
// prior finding it saw in context, or simply hallucinating the shape — json.Unmarshal would
// populate them and the report would show "adjusted by analyst" for a decision no human
// made. The attestation must only ever be written by the mutation, so it is cleared on the
// way in.
func StripAnalystFields(findings []Finding) []Finding {
	for i := range findings {
		findings[i].SeverityUpdated = false
		findings[i].OriginalSeverity = ""
		findings[i].OriginalCVSS = nil
	}

	return findings
}

// PrepareFindingsForStorage is the single entry point every writer of MODEL-GENERATED
// findings must use before persisting them.
//
// It combines the two invariants that are easy to forget individually and silently costly
// to miss: the model may not assert an analyst decision, and a regeneration may not erase
// one. Bundling them means a new writer gets both or neither, rather than half.
//
// The analyst triage mutation does NOT use this: it is the one path that legitimately
// writes an override.
func PrepareFindingsForStorage(previous, incoming []Finding) []Finding {
	return PreserveSeverityOverrides(previous, StripAnalystFields(incoming))
}
