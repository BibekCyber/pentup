package graph

import (
	"testing"

	"pentagi/pkg/database"
	"pentagi/pkg/graph/model"
)

func TestConvertFlowFindings(t *testing.T) {
	rows := []database.GetFlowFindingsRow{
		{
			TaskID: 7,
			// Realistic reporter output: two criticals + a medium, mixed order.
			Findings: []byte(`[
				{"title":"Missing Rate Limiting","severity":"critical","cvss":9.0,"affected_urls":["/api/auth/login"]},
				{"title":"CORS Misconfiguration","severity":"medium","cvss":6.1,"recommendation":"Use a strict allowlist"}
			]`),
		},
		{
			TaskID: 9,
			Findings: []byte(`[
				{"title":"Token Revocation Failure","severity":"critical","cvss":9.1,"cve":"","description":"Logout keeps tokens valid","impact":["persistent access"]},
				{"title":"Unknown weakness","severity":"weird"}
			]`),
		},
		{
			TaskID:   11,
			Findings: []byte(`not-json`), // malformed: must be skipped, not fatal
		},
	}

	findings := convertFlowFindings(rows)

	if len(findings) != 4 {
		t.Fatalf("expected 4 findings (malformed row skipped), got %d", len(findings))
	}

	// Sorted high-to-low: cvss 9.1 critical, cvss 9.0 critical, medium, then informational fallback.
	wantOrder := []struct {
		title    string
		severity model.Severity
	}{
		{"Token Revocation Failure", model.SeverityCritical},
		{"Missing Rate Limiting", model.SeverityCritical},
		{"CORS Misconfiguration", model.SeverityMedium},
		{"Unknown weakness", model.SeverityInformational}, // invalid severity falls back
	}

	for i, want := range wantOrder {
		if findings[i].Title != want.title {
			t.Errorf("position %d: title = %q, want %q", i, findings[i].Title, want.title)
		}
		if findings[i].Severity != want.severity {
			t.Errorf("position %d (%s): severity = %q, want %q", i, findings[i].Title, findings[i].Severity, want.severity)
		}
	}

	// taskId is preserved for anchoring back to the methodology section.
	if findings[0].TaskID != 9 {
		t.Errorf("expected top finding to come from task 9, got %d", findings[0].TaskID)
	}

	// Optional empty strings must become nil pointers, not empty-string pointers.
	if findings[0].Cve != nil {
		t.Errorf("empty cve should map to nil, got %q", *findings[0].Cve)
	}
	if findings[0].Description == nil || *findings[0].Description == "" {
		t.Errorf("non-empty description should be preserved")
	}
}
