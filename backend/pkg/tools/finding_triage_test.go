package tools

import (
	"encoding/json"
	"strings"
	"testing"
)

// Analyst triage fields live on tools.Finding for storage, but the reporter agent must
// never see them: if they reached the report_result schema the model could invent an
// override or overwrite a human decision. This guards the `jsonschema:"-"` tags.
func TestAnalystFieldsHiddenFromToolSchema(t *testing.T) {
	def := GetRegistryDefinitions()[ReportResultToolName]
	blob, err := json.Marshal(def.Parameters)
	if err != nil {
		t.Fatal(err)
	}
	s := string(blob)
	for _, hidden := range []string{"severity_updated", "original_severity", "original_cvss"} {
		if strings.Contains(s, hidden) {
			t.Errorf("%q leaked into the LLM tool schema", hidden)
		}
	}
	for _, required := range []string{"steps_to_reproduce", "recommendation"} {
		if !strings.Contains(s, required) {
			t.Errorf("%q missing from tool schema — reflection broke", required)
		}
	}
}

// The model sometimes keeps a subtask's severity label next to a CVSS score it derived
// itself, which prints a score outside the band the label claims. The score wins.
func TestAlignSeverityToCVSS(t *testing.T) {
	score := func(v float64) *float64 { return &v }

	findings := AlignSeverityToCVSS([]Finding{
		{Title: "label too low", Severity: "low", CVSS: score(5.3)},
		{Title: "label too high", Severity: "high", CVSS: score(3.1)},
		{Title: "already consistent", Severity: "medium", CVSS: score(6.1)},
		{Title: "band edge", Severity: "medium", CVSS: score(9.0)},
		{Title: "informational zero", Severity: "informational", CVSS: score(0)},
		{Title: "labelled low with zero", Severity: "low", CVSS: score(0)},
		{Title: "no score", Severity: "medium"},
	})

	want := []struct {
		severity string
		hasCVSS  bool
	}{
		{"medium", true},
		{"low", true},
		{"medium", true},
		{"critical", true},
		{"informational", false},
		{"low", false},
		{"medium", false},
	}

	for i, w := range want {
		if findings[i].Severity != w.severity {
			t.Errorf("%s: severity %q, want %q", findings[i].Title, findings[i].Severity, w.severity)
		}
		if (findings[i].CVSS != nil) != w.hasCVSS {
			t.Errorf("%s: has CVSS %v, want %v", findings[i].Title, findings[i].CVSS != nil, w.hasCVSS)
		}
	}
}

// An analyst override must still win over the aligned severity on regeneration.
func TestPrepareFindingsForStorageAlignsThenKeepsOverrides(t *testing.T) {
	score := func(v float64) *float64 { return &v }

	previous := []Finding{{Title: "Weak DMARC", Severity: "low", SeverityUpdated: true, OriginalSeverity: "medium", OriginalCVSS: score(5.3)}}
	incoming := []Finding{
		{Title: "Weak DMARC", Severity: "low", CVSS: score(5.3)},
		{Title: "Missing HSTS", Severity: "low", CVSS: score(5.3)},
	}

	got := PrepareFindingsForStorage(previous, incoming)

	if got[0].Severity != "low" || !got[0].SeverityUpdated {
		t.Errorf("analyst override lost: severity %q, updated %v", got[0].Severity, got[0].SeverityUpdated)
	}
	if got[1].Severity != "medium" {
		t.Errorf("unreviewed finding not aligned to its CVSS band: got %q", got[1].Severity)
	}
}
