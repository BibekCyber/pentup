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
