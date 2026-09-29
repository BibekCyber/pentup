package graph

import (
	"encoding/json"
	"sort"
	"strings"

	"pentagi/pkg/database"
	"pentagi/pkg/graph/model"
	"pentagi/pkg/tools"
)

var findingSeverityWeight = map[model.Severity]int{
	model.SeverityCritical:      5,
	model.SeverityHigh:          4,
	model.SeverityMedium:        3,
	model.SeverityLow:           2,
	model.SeverityInformational: 1,
}

// parseFindings unmarshals one findings JSONB blob into GraphQL findings tagged
// with their source taskID. A malformed blob yields no findings rather than an error,
// so one bad source never breaks the whole report.
func parseFindings(blob json.RawMessage, taskID int64) []*model.Finding {
	if len(blob) == 0 {
		return nil
	}

	var parsed []tools.Finding
	if err := json.Unmarshal(blob, &parsed); err != nil {
		return nil
	}

	findings := make([]*model.Finding, 0, len(parsed))
	for index, finding := range parsed {
		findings = append(findings, convertFinding(taskID, index, finding))
	}

	return findings
}

// sortFindings orders findings high-to-low (severity, then CVSS, then title).
func sortFindings(findings []*model.Finding) {
	sort.SliceStable(findings, func(i, j int) bool {
		if wi, wj := findingSeverityWeight[findings[i].Severity], findingSeverityWeight[findings[j].Severity]; wi != wj {
			return wi > wj
		}

		ci, cj := findingCVSS(findings[i]), findingCVSS(findings[j])
		if ci != cj {
			return ci > cj
		}

		return findings[i].Title < findings[j].Title
	})
}

// convertFlowFindings flattens the per-task findings blobs into one sorted list.
func convertFlowFindings(rows []database.GetFlowFindingsRow) []*model.Finding {
	findings := make([]*model.Finding, 0, len(rows))
	for _, row := range rows {
		findings = append(findings, parseFindings(row.Findings, row.TaskID)...)
	}

	sortFindings(findings)

	return findings
}

// convertAssistantFindings parses an assistant's findings blob into a sorted list.
// Assistant findings are not task-bound, so their taskID is left as 0.
func convertAssistantFindings(blob json.RawMessage) []*model.Finding {
	findings := parseFindings(blob, 0)
	sortFindings(findings)

	return findings
}

func findingCVSS(f *model.Finding) float64 {
	if f.Cvss == nil {
		return 0
	}

	return *f.Cvss
}

func convertFinding(taskID int64, index int, finding tools.Finding) *model.Finding {
	severity := model.Severity(strings.ToLower(strings.TrimSpace(finding.Severity)))
	if !severity.IsValid() {
		severity = model.SeverityInformational
	}

	converted := &model.Finding{
		TaskID:           taskID,
		Index:            index,
		Title:            finding.Title,
		Severity:         severity,
		SeverityUpdated:  finding.SeverityUpdated,
		Cvss:             finding.CVSS,
		AffectedUrls:     finding.AffectedURLs,
		Impact:           finding.Impact,
		StepsToReproduce: finding.StepsToReproduce,
		References:       finding.References,
	}

	if original := model.Severity(strings.ToLower(strings.TrimSpace(finding.OriginalSeverity))); original.IsValid() {
		converted.OriginalSeverity = &original
	}
	converted.OriginalCvss = finding.OriginalCVSS
	if finding.CVE != "" {
		converted.Cve = &finding.CVE
	}
	if finding.Description != "" {
		converted.Description = &finding.Description
	}
	if finding.Evidence != "" {
		converted.Evidence = &finding.Evidence
	}
	if finding.Recommendation != "" {
		converted.Recommendation = &finding.Recommendation
	}

	return converted
}
