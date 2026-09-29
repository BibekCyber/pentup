package tools

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// Every writer of MODEL-GENERATED findings must route through PrepareFindingsForStorage.
// Unit tests on the helper prove it behaves; they cannot prove it is called, and a writer
// that forgets it silently lets the model forge an "adjusted by analyst" attestation and
// erases real analyst decisions on the next regeneration. Both failures are invisible in
// normal use, which is exactly why this is asserted structurally.
//
// The analyst triage mutation (pkg/graph) is deliberately excluded: it is the one path that
// legitimately writes an override.
func TestEveryModelFindingsWriterUsesPrepareFindingsForStorage(t *testing.T) {
	writers := map[string]string{
		"../controller/task.go":         "the task reporter persists regenerated findings",
		"../controller/assistant.go":    "assistant re-extraction persists regenerated findings",
		"../../cmd/reportregen/main.go": "the report regeneration tool persists regenerated findings",
	}

	for path, why := range writers {
		source, err := os.ReadFile(filepath.Clean(path))
		if err != nil {
			t.Errorf("cannot read %s (%s): %v", path, why, err)

			continue
		}

		content := string(source)

		persists := strings.Contains(content, "UpdateTaskFindings") ||
			strings.Contains(content, "UpdateAssistantFindings")
		if !persists {
			t.Errorf("%s no longer persists findings — update this guard (%s)", path, why)

			continue
		}

		if !strings.Contains(content, "PrepareFindingsForStorage") {
			t.Errorf("%s persists model findings without PrepareFindingsForStorage: "+
				"the model could forge an analyst override, and existing overrides would be erased (%s)",
				path, why)
		}
	}
}
