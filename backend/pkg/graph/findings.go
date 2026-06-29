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

// convertFlowFindings flattens the per-task findings JSONB blobs into a single
// list of GraphQL findings sorted high-to-low (severity, then CVSS, then title).
// Malformed blobs are skipped so one bad task never breaks the whole report.
func convertFlowFindings(rows []database.GetFlowFindingsRow) []*model.Finding {
	findings := make([]*model.Finding, 0, len(rows))

	for _, row := range rows {
		if len(row.Findings) == 0 {
			continue
		}

		var parsed []tools.Finding
		if err := json.Unmarshal(row.Findings, &parsed); err != nil {
			continue
		}

		for _, finding := range parsed {
			findings = append(findings, convertFinding(row.TaskID, finding))
		}
	}

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

	return findings
}

func findingCVSS(f *model.Finding) float64 {
	if f.Cvss == nil {
		return 0
	}

	return *f.Cvss
}

func convertFinding(taskID int64, finding tools.Finding) *model.Finding {
	severity := model.Severity(strings.ToLower(strings.TrimSpace(finding.Severity)))
	if !severity.IsValid() {
		severity = model.SeverityInformational
	}

	converted := &model.Finding{
		TaskID:           taskID,
		Title:            finding.Title,
		Severity:         severity,
		Cvss:             finding.CVSS,
		AffectedUrls:     finding.AffectedURLs,
		Impact:           finding.Impact,
		StepsToReproduce: finding.StepsToReproduce,
		References:       finding.References,
	}

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
