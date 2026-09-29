package graph

import (
	"encoding/json"
	"errors"
	"testing"

	"pentagi/pkg/tools"
)

func cvssPtr(v float64) *float64 { return &v }

func blobOf(t *testing.T, findings ...tools.Finding) json.RawMessage {
	t.Helper()

	blob, err := json.Marshal(findings)
	if err != nil {
		t.Fatal(err)
	}

	return blob
}

func decode(t *testing.T, blob json.RawMessage) []tools.Finding {
	t.Helper()

	var findings []tools.Finding
	if err := json.Unmarshal(blob, &findings); err != nil {
		t.Fatal(err)
	}

	return findings
}

func TestOverrideCapturesOriginalAndRescoresCVSS(t *testing.T) {
	blob := blobOf(t, tools.Finding{Title: "A", Severity: "critical", CVSS: cvssPtr(9.8)})

	updated, err := applySeverityOverride(blob, 0, "A", "low")
	if err != nil {
		t.Fatal(err)
	}

	got := decode(t, updated)[0]
	if got.Severity != "low" {
		t.Errorf("severity = %q, want low", got.Severity)
	}
	if !got.SeverityUpdated {
		t.Error("SeverityUpdated should be true")
	}
	if got.OriginalSeverity != "critical" {
		t.Errorf("OriginalSeverity = %q, want critical", got.OriginalSeverity)
	}
	// The score follows the new rating into its band rather than disappearing, so the
	// report never shows a severity and score that contradict its own band table.
	if got.CVSS == nil || *got.CVSS != 3.9 {
		t.Errorf("CVSS should be rescored into the low band, got %v", got.CVSS)
	}
	if got.OriginalCVSS == nil || *got.OriginalCVSS != 9.8 {
		t.Error("OriginalCVSS should retain 9.8 for audit")
	}
}

func TestRepeatedOverridesKeepTheModelsOriginal(t *testing.T) {
	blob := blobOf(t, tools.Finding{Title: "A", Severity: "critical", CVSS: cvssPtr(9.8)})

	updated, err := applySeverityOverride(blob, 0, "A", "low")
	if err != nil {
		t.Fatal(err)
	}

	// A second edit must not treat "low" as the original — that would erase what the
	// model actually assessed and make the audit trail lie.
	updated, err = applySeverityOverride(updated, 0, "A", "medium")
	if err != nil {
		t.Fatal(err)
	}

	got := decode(t, updated)[0]
	if got.OriginalSeverity != "critical" {
		t.Errorf("OriginalSeverity = %q, want critical after two edits", got.OriginalSeverity)
	}
	if got.OriginalCVSS == nil || *got.OriginalCVSS != 9.8 {
		t.Error("OriginalCVSS should survive repeated edits")
	}
}

func TestResettingToOriginalClearsTheOverrideAndRestoresCVSS(t *testing.T) {
	blob := blobOf(t, tools.Finding{Title: "A", Severity: "high", CVSS: cvssPtr(7.5)})

	updated, err := applySeverityOverride(blob, 0, "A", "low")
	if err != nil {
		t.Fatal(err)
	}

	updated, err = applySeverityOverride(updated, 0, "A", "high")
	if err != nil {
		t.Fatal(err)
	}

	got := decode(t, updated)[0]
	if got.SeverityUpdated {
		t.Error("re-rating back to the original must clear the override flag")
	}
	if got.OriginalSeverity != "" {
		t.Errorf("OriginalSeverity should be cleared, got %q", got.OriginalSeverity)
	}
	if got.CVSS == nil || *got.CVSS != 7.5 {
		t.Error("CVSS should be restored once no override is in force")
	}
	if got.OriginalCVSS != nil {
		t.Error("OriginalCVSS should be cleared once no override is in force")
	}
}

func TestOverrideTouchesOnlyTheTargetedFinding(t *testing.T) {
	blob := blobOf(t,
		tools.Finding{Title: "A", Severity: "critical", CVSS: cvssPtr(9.1)},
		tools.Finding{Title: "B", Severity: "high", CVSS: cvssPtr(7.2)},
		tools.Finding{Title: "C", Severity: "medium"},
	)

	updated, err := applySeverityOverride(blob, 1, "B", "low")
	if err != nil {
		t.Fatal(err)
	}

	got := decode(t, updated)
	if len(got) != 3 {
		t.Fatalf("finding count changed: %d", len(got))
	}
	if got[0].Severity != "critical" || got[0].CVSS == nil || *got[0].CVSS != 9.1 {
		t.Error("finding A was modified")
	}
	if got[2].Severity != "medium" {
		t.Error("finding C was modified")
	}
	if got[1].Severity != "low" || !got[1].SeverityUpdated {
		t.Error("finding B was not overridden")
	}
}

func TestOutOfRangeIndexIsRejected(t *testing.T) {
	blob := blobOf(t, tools.Finding{Title: "A", Severity: "high"})

	for _, index := range []int{-1, 1, 99} {
		if _, err := applySeverityOverride(blob, index, "A", "low"); err == nil {
			t.Errorf("index %d should be rejected", index)
		}
	}
}

func TestOverridePreservesEveryOtherField(t *testing.T) {
	blob := blobOf(t, tools.Finding{
		Title:            "A",
		Severity:         "high",
		CVE:              "CVE-2024-1234",
		AffectedURLs:     []string{"https://x.test"},
		Description:      "desc",
		Evidence:         "evidence",
		Impact:           []string{"i1", "i2"},
		StepsToReproduce: []string{"s1"},
		Recommendation:   "fix it",
		References:       []string{"https://cwe.mitre.org/x"},
	})

	updated, err := applySeverityOverride(blob, 0, "A", "low")
	if err != nil {
		t.Fatal(err)
	}

	got := decode(t, updated)[0]
	if got.Title != "A" || got.CVE != "CVE-2024-1234" || got.Description != "desc" ||
		got.Evidence != "evidence" || got.Recommendation != "fix it" ||
		len(got.Impact) != 2 || len(got.StepsToReproduce) != 1 ||
		len(got.AffectedURLs) != 1 || len(got.References) != 1 {
		t.Errorf("an unrelated field was lost: %+v", got)
	}
}

func TestMalformedBlobIsRejectedRatherThanOverwritten(t *testing.T) {
	if _, err := applySeverityOverride(json.RawMessage(`{"not":"an array"}`), 0, "A", "low"); err == nil {
		t.Error("a malformed blob must error, never be replaced wholesale")
	}
}

// Regression: the findings array is regenerated wholesale, so an index the client read
// minutes ago can address a different finding. Without an identity check the wrong finding
// is silently re-rated and falsely attributed to an analyst.
func TestStaleIndexIsRejectedRatherThanReRatingTheWrongFinding(t *testing.T) {
	// The page loaded [SQLi, XSS]; a re-extraction has since reordered them.
	blob := blobOf(t,
		tools.Finding{Title: "Weak TLS", Severity: "medium"},
		tools.Finding{Title: "SQL Injection", Severity: "critical"},
	)

	// The analyst clicked "XSS", which was at index 1 when the page loaded.
	_, err := applySeverityOverride(blob, 1, "XSS", "informational")
	if !errors.Is(err, ErrFindingChanged) {
		t.Fatalf("expected ErrFindingChanged, got %v", err)
	}

	// And the blob is untouched: SQL Injection keeps its critical rating.
	if got := decode(t, blob)[1]; got.Severity != "critical" || got.SeverityUpdated {
		t.Errorf("the wrong finding was modified: %+v", got)
	}
}

func TestTitleMatchIgnoresCosmeticDifferences(t *testing.T) {
	blob := blobOf(t, tools.Finding{Title: "Missing  Security Headers", Severity: "high"})

	if _, err := applySeverityOverride(blob, 0, "missing security headers", "low"); err != nil {
		t.Errorf("cosmetic title differences should still match: %v", err)
	}
}

func TestInvalidRequestedSeverityIsRejected(t *testing.T) {
	blob := blobOf(t, tools.Finding{Title: "A", Severity: "high"})

	if _, err := applySeverityOverride(blob, 0, "A", "catastrophic"); err == nil {
		t.Error("a severity outside the enum must be rejected")
	}
}

// Regression: a stored severity the model got wrong must still yield a resettable override.
// Recording an unknown value as the original would offer the analyst no way back, and the
// CVSS would stay parked forever.
func TestOverrideOnAnUnknownStoredSeverityStaysResettable(t *testing.T) {
	blob := blobOf(t, tools.Finding{Title: "A", Severity: "SEV-1", CVSS: cvssPtr(8.0)})

	updated, err := applySeverityOverride(blob, 0, "A", "low")
	if err != nil {
		t.Fatal(err)
	}

	got := decode(t, updated)[0]
	if got.OriginalSeverity != "informational" {
		t.Errorf("OriginalSeverity = %q, want the informational fallback", got.OriginalSeverity)
	}

	// The recorded original is a value the UI can offer, so the override reverses.
	updated, err = applySeverityOverride(updated, 0, "A", "informational")
	if err != nil {
		t.Fatal(err)
	}

	if reset := decode(t, updated)[0]; reset.SeverityUpdated || reset.CVSS == nil {
		t.Errorf("override should have fully reset: %+v", reset)
	}
}

// Regression: an override recorded against an empty stored severity must not be mistaken
// for "no override in force" — that read the flag off the wrong signal and made the
// finding permanently unresettable.
func TestOverrideStateIsReadFromTheFlagNotAnEmptyString(t *testing.T) {
	blob := blobOf(t, tools.Finding{
		Title: "A", Severity: "low", SeverityUpdated: true, OriginalSeverity: "",
	})

	updated, err := applySeverityOverride(blob, 0, "A", "high")
	if err != nil {
		t.Fatal(err)
	}

	if got := decode(t, updated)[0]; got.OriginalSeverity != "" || !got.SeverityUpdated {
		t.Errorf("an in-force override must not recapture its original: %+v", got)
	}
}

func TestOverrideRescoresIntoTheNewBand(t *testing.T) {
	blob := blobOf(t, tools.Finding{Title: "A", Severity: "critical", CVSS: cvssPtr(9.8)})

	updated, err := applySeverityOverride(blob, 0, "A", "low")
	if err != nil {
		t.Fatal(err)
	}

	got := decode(t, updated)[0]
	if got.CVSS == nil || *got.CVSS != 3.9 {
		t.Errorf("CVSS should move to the top of the low band (3.9), got %v", got.CVSS)
	}
	if got.OriginalCVSS == nil || *got.OriginalCVSS != 9.8 {
		t.Error("the model's score should be retained for audit and reset")
	}
}

func TestCVSSMustSitInsideItsSeverityBand(t *testing.T) {
	blob := blobOf(t, tools.Finding{Title: "A", Severity: "medium", CVSS: cvssPtr(6.9)})

	// The appendix tells the client medium means 4.0-6.9; 9.1 would contradict it.
	if _, err := applyCVSSScore(blob, 0, "A", 9.1); err == nil {
		t.Error("a score outside the severity's band must be rejected")
	}

	updated, err := applyCVSSScore(blob, 0, "A", 5.2)
	if err != nil {
		t.Fatal(err)
	}

	if got := decode(t, updated)[0]; got.CVSS == nil || *got.CVSS != 5.2 {
		t.Errorf("an in-band score should be stored, got %v", got.CVSS)
	}
}

func TestCVSSEditCapturesTheModelsScoreOnce(t *testing.T) {
	blob := blobOf(t, tools.Finding{Title: "A", Severity: "high", CVSS: cvssPtr(7.5)})

	updated, err := applyCVSSScore(blob, 0, "A", 8.1)
	if err != nil {
		t.Fatal(err)
	}

	updated, err = applyCVSSScore(updated, 0, "A", 8.4)
	if err != nil {
		t.Fatal(err)
	}

	if got := decode(t, updated)[0]; got.OriginalCVSS == nil || *got.OriginalCVSS != 7.5 {
		t.Error("repeated edits must not lose the model's original score")
	}
}

func TestCVSSEditIsRejectedOnAStaleIndex(t *testing.T) {
	blob := blobOf(t, tools.Finding{Title: "A", Severity: "high"})

	if _, err := applyCVSSScore(blob, 0, "Something else", 7.5); !errors.Is(err, ErrFindingChanged) {
		t.Errorf("expected ErrFindingChanged, got %v", err)
	}
}

// A score edit is an analyst decision like a re-rating: it must be flagged and reversible,
// otherwise the report shows an analyst-chosen number with no record that a human set it.
func TestCVSSEditIsTrackedAndReversible(t *testing.T) {
	blob := blobOf(t, tools.Finding{Title: "A", Severity: "high", CVSS: cvssPtr(7.5)})

	updated, err := applyCVSSScore(blob, 0, "A", 8.4)
	if err != nil {
		t.Fatal(err)
	}

	edited := decode(t, updated)[0]
	if !edited.SeverityUpdated {
		t.Error("a score edit must set the adjusted flag")
	}
	if edited.OriginalSeverity != "high" || edited.OriginalCVSS == nil || *edited.OriginalCVSS != 7.5 {
		t.Errorf("the model's assessment must be captured: %+v", edited)
	}
	if edited.Severity != "high" {
		t.Error("a score edit inside the band must not change the rating")
	}

	// Typing the original score back restores the model's assessment exactly.
	updated, err = applyCVSSScore(updated, 0, "A", 7.5)
	if err != nil {
		t.Fatal(err)
	}

	reset := decode(t, updated)[0]
	if reset.SeverityUpdated || reset.OriginalSeverity != "" || reset.OriginalCVSS != nil {
		t.Errorf("returning to the model's score must clear the override: %+v", reset)
	}
	if reset.CVSS == nil || *reset.CVSS != 7.5 {
		t.Error("the score should be back to the model's value")
	}
}

// Resetting the severity restores the model's score too — the pair is one judgement.
func TestResetRestoresTheModelsScoreAfterBothEdits(t *testing.T) {
	blob := blobOf(t, tools.Finding{Title: "A", Severity: "critical", CVSS: cvssPtr(9.8)})

	updated, err := applySeverityOverride(blob, 0, "A", "medium")
	if err != nil {
		t.Fatal(err)
	}

	updated, err = applyCVSSScore(updated, 0, "A", 4.7)
	if err != nil {
		t.Fatal(err)
	}

	updated, err = applySeverityOverride(updated, 0, "A", "critical")
	if err != nil {
		t.Fatal(err)
	}

	got := decode(t, updated)[0]
	if got.SeverityUpdated || got.CVSS == nil || *got.CVSS != 9.8 {
		t.Errorf("reset must restore the model's severity and score: %+v", got)
	}
}
