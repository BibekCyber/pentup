package graph

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"pentagi/pkg/database"
	"pentagi/pkg/graph/model"
	"pentagi/pkg/tools"
)

// ErrFindingChanged reports that the finding at the requested position is no longer the one
// the analyst was looking at, so the edit was not applied.
var ErrFindingChanged = errors.New("the report changed since it was loaded; reload and try again")

// applySeverityOverride re-rates one finding inside a findings JSONB blob and returns the
// updated blob.
//
// Findings have no per-row identity — they are an array inside tasks.findings /
// assistants.findings — so a finding is addressed by its position in that array, which
// travels to the client as Finding.index (the report displays findings severity-sorted, so
// list order is not an address).
//
// A position alone is not safe. The findings array is regenerated wholesale by the reporter
// and by assistant re-extraction, which reorders and re-members it, so an index a page
// loaded minutes ago can now denote a different finding. expectedTitle pins the edit to the
// finding the analyst actually saw; a mismatch fails loudly rather than silently re-rating
// the wrong one and attributing it to an analyst who never made that call.
//
// The override rules:
//   - severity is overwritten in place, so every derived value (counts, colours, ordering,
//     the executive summary, the PDF) follows with no further changes;
//   - the model's own assessment is captured once, when the override is first applied, so
//     repeated edits never lose it;
//   - the CVSS score moves into the new severity's band (its top, as a starting point the
//     analyst can then adjust). Leaving the model's score would contradict the
//     CVSS-to-severity band table the report's appendix publishes to the client;
//   - re-rating back to the original clears the override entirely and restores the score.
func applySeverityOverride(blob json.RawMessage, index int, expectedTitle, severity string) (json.RawMessage, error) {
	var findings []tools.Finding
	if len(blob) > 0 {
		if err := json.Unmarshal(blob, &findings); err != nil {
			return nil, fmt.Errorf("failed to parse stored findings: %w", err)
		}
	}

	if index < 0 || index >= len(findings) {
		return nil, ErrFindingChanged
	}

	finding := &findings[index]
	if tools.FindingKey(finding.Title) != tools.FindingKey(expectedTitle) {
		return nil, ErrFindingChanged
	}

	requested := strings.ToLower(strings.TrimSpace(severity))
	if !model.Severity(requested).IsValid() {
		return nil, fmt.Errorf("invalid severity %q", severity)
	}

	// The flag — not an empty string — marks whether an override is already in force. A
	// stored severity can itself be empty or outside the enum, and treating that as "no
	// override" would leave the finding permanently overridden with no way back.
	original := finding.OriginalSeverity
	originalCVSS := finding.OriginalCVSS
	if !finding.SeverityUpdated {
		original = tools.NormaliseSeverity(finding.Severity)
		originalCVSS = finding.CVSS
	}

	if requested == original {
		finding.Severity = original
		finding.SeverityUpdated = false
		finding.OriginalSeverity = ""
		finding.CVSS = originalCVSS
		finding.OriginalCVSS = nil
	} else {
		rescored := tools.DefaultScoreFor(requested)

		finding.Severity = requested
		finding.SeverityUpdated = true
		finding.OriginalSeverity = original
		finding.OriginalCVSS = originalCVSS
		finding.CVSS = &rescored
	}

	updated, err := json.Marshal(findings)
	if err != nil {
		return nil, fmt.Errorf("failed to encode findings: %w", err)
	}

	return updated, nil
}

// applyCVSSScore records an analyst-chosen CVSS score for a finding.
//
// The score must sit inside the band its severity denotes. Severity is the analyst's
// decision and the score refines it, so a number field never silently rewrites the rating:
// a typo of 9.1 for 3.1 would otherwise escalate a finding to critical in a client-facing
// report with no confirmation. Out-of-band input is rejected with the range instead, and
// the analyst re-rates first if they genuinely mean to move bands.
//
// A score edit is an override like any other: it sets the adjusted flag and captures the
// model's own assessment, so the finding can be reset to exactly what the model produced.
func applyCVSSScore(blob json.RawMessage, index int, expectedTitle string, score float64) (json.RawMessage, error) {
	var findings []tools.Finding
	if len(blob) > 0 {
		if err := json.Unmarshal(blob, &findings); err != nil {
			return nil, fmt.Errorf("failed to parse stored findings: %w", err)
		}
	}

	if index < 0 || index >= len(findings) {
		return nil, ErrFindingChanged
	}

	finding := &findings[index]
	if tools.FindingKey(finding.Title) != tools.FindingKey(expectedTitle) {
		return nil, ErrFindingChanged
	}

	severity := tools.NormaliseSeverity(finding.Severity)

	band := tools.BandFor(severity)
	if score < band.Min || score > band.Max {
		return nil, fmt.Errorf("a %s finding scores between %.1f and %.1f, got %.1f",
			severity, band.Min, band.Max, score)
	}

	original := finding.OriginalSeverity
	originalCVSS := finding.OriginalCVSS
	if !finding.SeverityUpdated {
		original = severity
		originalCVSS = finding.CVSS
	}

	// Back to exactly what the model assessed — same rating, same score — so there is
	// nothing left to flag as adjusted.
	if severity == original && originalCVSS != nil && *originalCVSS == score {
		finding.Severity = original
		finding.SeverityUpdated = false
		finding.OriginalSeverity = ""
		finding.CVSS = originalCVSS
		finding.OriginalCVSS = nil
	} else {
		finding.SeverityUpdated = true
		finding.OriginalSeverity = original
		finding.OriginalCVSS = originalCVSS
		finding.CVSS = &score
	}

	updated, err := json.Marshal(findings)
	if err != nil {
		return nil, fmt.Errorf("failed to encode findings: %w", err)
	}

	return updated, nil
}

// findingsMutation resolves which findings blob an edit targets, checks the caller may edit
// that flow, applies the change and persists it.
//
// Both triage mutations need the same source resolution, ownership check and write, and the
// assistant path has an easy-to-miss detail: FindingsHash must be preserved. It fingerprints
// the assessment text the findings were extracted from, not the findings themselves, so
// rewriting it here would make an unchanged report look stale and invite a re-extraction
// that discards the analyst's edit.
func (r *mutationResolver) findingsMutation(
	ctx context.Context,
	taskID, assistantID *int64,
	apply func(blob json.RawMessage) (json.RawMessage, error),
) (model.ResultType, error) {
	switch {
	case taskID != nil:
		task, err := r.DB.GetTask(ctx, *taskID)
		if err != nil {
			return model.ResultTypeError, fmt.Errorf("failed to get task %d: %w", *taskID, err)
		}

		if _, err := validatePermissionWithFlowID(ctx, "flows.edit", task.FlowID, r.DB); err != nil {
			return model.ResultTypeError, err
		}

		findings, err := apply(task.Findings)
		if err != nil {
			return model.ResultTypeError, err
		}

		if err := r.DB.UpdateTaskFindings(ctx, database.UpdateTaskFindingsParams{
			Findings: findings,
			ID:       task.ID,
		}); err != nil {
			return model.ResultTypeError, fmt.Errorf("failed to update task findings: %w", err)
		}

	case assistantID != nil:
		assistant, err := r.DB.GetAssistant(ctx, *assistantID)
		if err != nil {
			return model.ResultTypeError, fmt.Errorf("failed to get assistant %d: %w", *assistantID, err)
		}

		if _, err := validatePermissionWithFlowID(ctx, "flows.edit", assistant.FlowID, r.DB); err != nil {
			return model.ResultTypeError, err
		}

		findings, err := apply(assistant.Findings)
		if err != nil {
			return model.ResultTypeError, err
		}

		if err := r.DB.UpdateAssistantFindings(ctx, database.UpdateAssistantFindingsParams{
			Findings:     findings,
			FindingsHash: assistant.FindingsHash,
			ID:           assistant.ID,
		}); err != nil {
			return model.ResultTypeError, fmt.Errorf("failed to update assistant findings: %w", err)
		}

	default:
		return model.ResultTypeError, fmt.Errorf("either taskId or assistantId is required")
	}

	return model.ResultTypeSuccess, nil
}
