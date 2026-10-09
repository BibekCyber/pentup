package templates

import (
	"strings"
	"testing"

	"pentagi/pkg/tools"
)

// Automation mode (reporter.tmpl) and Assistant mode (providers/assistant.go) both produce
// the same client-facing PDF, so they must impose the same per-finding quality bar. They
// previously carried independent instructions, and a depth improvement made for automation
// silently did not reach assistant reports. StructuredFindingsSpec is now the single source
// of truth; this test fails if the reporter template stops rendering it.
func TestReporterTemplateRendersTheSharedFindingsSpec(t *testing.T) {
	prompter := NewDefaultPrompter()

	rendered, err := prompter.RenderTemplate(PromptTypeReporter, map[string]any{
		"FindingsSpec":            StructuredFindingsSpec,
		"ReportResultToolName":    tools.ReportResultToolName,
		"SummarizationToolName":   "summarized_content",
		"SummarizedContentPrefix": "[summarized]",
		"Lang":                    "English",
		"N":                       4000,
		"ToolPlaceholder":         "",
	})
	if err != nil {
		t.Fatalf("render reporter template: %v", err)
	}

	if !strings.Contains(rendered, StructuredFindingsSpec) {
		t.Error("reporter.tmpl no longer renders StructuredFindingsSpec; automation and assistant reports would drift apart")
	}

	// Spot-check the requirements that carry the depth, so a truncated or emptied spec is
	// caught rather than silently shipping shallow findings to a client.
	for _, required := range []string{
		`"description"`,
		`"impact"`,
		`"steps_to_reproduce"`,
		`"recommendation"`,
		`"references"`,
		`"Expected:"`,
		"Observed (summary):",
		"/tmp, /work",
	} {
		if !strings.Contains(rendered, required) {
			t.Errorf("rendered reporter prompt is missing the %q requirement", required)
		}
	}
}
