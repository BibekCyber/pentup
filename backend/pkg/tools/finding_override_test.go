package tools

import "testing"

func f(title, severity string, updated bool, original string) Finding {
	return Finding{Title: title, Severity: severity, SeverityUpdated: updated, OriginalSeverity: original}
}

func TestOverrideSurvivesRegeneration(t *testing.T) {
	previous := []Finding{f("Missing Security Headers", "low", true, "high")}
	current := []Finding{f("Missing Security Headers", "high", false, "")}

	got := PreserveSeverityOverrides(previous, current)

	if got[0].Severity != "low" {
		t.Errorf("severity = %q, want the analyst's low", got[0].Severity)
	}
	if !got[0].SeverityUpdated || got[0].OriginalSeverity != "high" {
		t.Error("override metadata was not carried across")
	}
}

func TestRegenerationIsUntouchedWithoutOverrides(t *testing.T) {
	previous := []Finding{f("A", "high", false, "")}
	current := []Finding{f("A", "critical", false, "")}

	got := PreserveSeverityOverrides(previous, current)

	if got[0].Severity != "critical" || got[0].SeverityUpdated {
		t.Error("a finding with no override must keep the regenerated severity")
	}
}

func TestMatchingIsByTitleNotPosition(t *testing.T) {
	// Regeneration commonly reorders findings, so position cannot identify them.
	previous := []Finding{f("A", "high", false, ""), f("B", "low", true, "critical")}
	current := []Finding{f("B", "critical", false, ""), f("A", "high", false, "")}

	got := PreserveSeverityOverrides(previous, current)

	if got[0].Title != "B" || got[0].Severity != "low" {
		t.Errorf("override did not follow the finding to its new position: %+v", got[0])
	}
	if got[1].Title != "A" || got[1].SeverityUpdated {
		t.Error("the unedited finding was wrongly marked as overridden")
	}
}

func TestTitleMatchingIgnoresWhitespaceAndCase(t *testing.T) {
	previous := []Finding{f("Missing  Security Headers", "low", true, "high")}
	current := []Finding{f("missing security headers", "high", false, "")}

	if got := PreserveSeverityOverrides(previous, current); got[0].Severity != "low" {
		t.Error("cosmetic title differences should still match")
	}
}

func TestRetitledFindingKeepsTheModelsAssessment(t *testing.T) {
	previous := []Finding{f("Old title", "low", true, "critical")}
	current := []Finding{f("Completely different title", "critical", false, "")}

	got := PreserveSeverityOverrides(previous, current)

	if got[0].Severity != "critical" || got[0].SeverityUpdated {
		t.Error("a retitled finding must not inherit an unrelated override")
	}
}

func TestCVSSIsRescoredWhenAnOverrideIsCarried(t *testing.T) {
	score := 9.1
	previous := []Finding{f("A", "low", true, "critical")}
	current := []Finding{{Title: "A", Severity: "critical", CVSS: &score}}

	got := PreserveSeverityOverrides(previous, current)

	// The carried override keeps a score inside its own band rather than none at all.
	if got[0].CVSS == nil || *got[0].CVSS != DefaultScoreFor("low") {
		t.Errorf("CVSS should be rescored into the override's band, got %v", got[0].CVSS)
	}
	if got[0].OriginalCVSS == nil || *got[0].OriginalCVSS != 9.1 {
		t.Error("the regenerated CVSS should be retained for audit")
	}
}

func TestEmptyInputsAreSafe(t *testing.T) {
	if got := PreserveSeverityOverrides(nil, nil); got != nil {
		t.Error("nil inputs should stay nil")
	}
	if got := PreserveSeverityOverrides([]Finding{}, []Finding{f("A", "high", false, "")}); len(got) != 1 {
		t.Error("an empty previous set must pass the current set through")
	}
}

// Regression: the "original" pair must describe ONE assessment. Taking the severity from
// the previous override while refreshing the CVSS from the new run pairs a stale rating
// with a fresh score, so resetting would restore a severity and CVSS that contradict the
// CVSS-to-severity band table the report publishes.
func TestRegenerationKeepsTheOriginalPairConsistent(t *testing.T) {
	oldScore, newScore := 9.8, 6.4
	previous := []Finding{{
		Title: "A", Severity: "low", SeverityUpdated: true,
		OriginalSeverity: "critical", OriginalCVSS: &oldScore,
	}}
	// The reporter now rates this medium with a lower score.
	current := []Finding{{Title: "A", Severity: "medium", CVSS: &newScore}}

	got := PreserveSeverityOverrides(previous, current)[0]

	if got.Severity != "low" {
		t.Errorf("the analyst's rating must survive, got %q", got.Severity)
	}
	if got.OriginalSeverity != "medium" {
		t.Errorf("OriginalSeverity = %q, want the regenerated medium", got.OriginalSeverity)
	}
	if got.OriginalCVSS == nil || *got.OriginalCVSS != newScore {
		t.Error("OriginalCVSS must come from the same assessment as OriginalSeverity")
	}
}

// Regression: `jsonschema:"-"` hides these fields from the tool schema, but the json tags
// stay live. A model that emits them anyway must not be able to forge an analyst decision.
func TestModelSuppliedAnalystFieldsAreStripped(t *testing.T) {
	score := 9.1
	forged := []Finding{{
		Title: "A", Severity: "low",
		SeverityUpdated: true, OriginalSeverity: "critical", OriginalCVSS: &score,
	}}

	got := StripAnalystFields(forged)[0]

	if got.SeverityUpdated || got.OriginalSeverity != "" || got.OriginalCVSS != nil {
		t.Errorf("model-supplied triage fields must be cleared: %+v", got)
	}
	if got.Severity != "low" || got.Title != "A" {
		t.Error("stripping must not touch the model's own assessment")
	}
}

// Regression: when the reporter's new rating already matches the analyst's, the override is
// moot. Keeping the flag would show a permanent "adjusted" label on a finding whose reset
// button does nothing, and would hide its CVSS from the client for good.
func TestOverrideClearsWhenTheModelCatchesUp(t *testing.T) {
	score := 5.3
	previous := []Finding{f("A", "medium", true, "critical")}
	current := []Finding{{Title: "A", Severity: "medium", CVSS: &score}}

	got := PreserveSeverityOverrides(previous, current)[0]

	if got.SeverityUpdated {
		t.Error("an override matching the regenerated rating must be cleared")
	}
	if got.OriginalSeverity != "" || got.OriginalCVSS != nil {
		t.Errorf("cleared override must leave no residue: %+v", got)
	}
	if got.CVSS == nil || *got.CVSS != score {
		t.Error("CVSS must be visible again once no override is in force")
	}
}

// Regression: a regenerated severity outside the enum must not be recorded as an original.
// The UI can only offer the five valid ratings back, so an unknown original strands the
// override forever — the exact failure NormaliseSeverity exists to prevent.
func TestRegenerationCoercesAnUnknownSeverityIntoAResettableOriginal(t *testing.T) {
	previous := []Finding{f("A", "low", true, "critical")}
	current := []Finding{{Title: "A", Severity: "SEV-1"}}

	got := PreserveSeverityOverrides(previous, current)[0]

	if got.OriginalSeverity != "informational" {
		t.Errorf("OriginalSeverity = %q, want the informational fallback", got.OriginalSeverity)
	}
}

func TestNormaliseSeverity(t *testing.T) {
	for input, want := range map[string]string{
		"CRITICAL": "critical", "  High ": "high", "medium": "medium",
		"": "informational", "SEV-1": "informational", "urgent": "informational",
	} {
		if got := NormaliseSeverity(input); got != want {
			t.Errorf("NormaliseSeverity(%q) = %q, want %q", input, got, want)
		}
	}
}
