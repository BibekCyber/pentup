package templates

import (
	"testing"

	"github.com/stretchr/testify/require"
)

// TestCoderPromptAdvertisesDirectFileAccess is a smoke test for the loop fix:
// the rendered coder prompt must tell the coder it can read/run files itself
// and must forbid asking the installer to paste back file contents.
func TestCoderPromptAdvertisesDirectFileAccess(t *testing.T) {
	rendered, err := NewDefaultPrompter().RenderTemplate(PromptTypeCoder, map[string]any{
		"CodeResultToolName":      "complete_code_development",
		"SearchCodeToolName":      "search_code",
		"StoreCodeToolName":       "store_code",
		"GraphitiEnabled":         false,
		"GraphitiSearchToolName":  "search_graphiti",
		"SearchToolName":          "search",
		"AdviceToolName":          "ask_advice",
		"MemoristToolName":        "memorist",
		"MaintenanceToolName":     "maintenance",
		"TerminalToolName":        "terminal",
		"FileToolName":            "file",
		"SummarizationToolName":   "summarized_content",
		"SummarizedContentPrefix": "summarized content:",
		"DockerImage":             "img",
		"Cwd":                     "/work",
		"ContainerPorts":          "",
		"ExecutionContext":        "",
		"Lang":                    "English",
		"CurrentTime":             "now",
		"ToolPlaceholder":         "x",
	})
	require.NoError(t, err)
	require.Contains(t, rendered, "DIRECT ENVIRONMENT ACCESS")
	require.Contains(t, rendered, "terminal", "terminal tool name must render")
	require.Contains(t, rendered, "file", "file tool name must render")
	require.Contains(t, rendered, "NEVER ask", "must forbid delegating file reads to the installer")
}
