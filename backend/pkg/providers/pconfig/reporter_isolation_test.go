package pconfig

import (
	"testing"

	"github.com/vxcontrol/langchaingo/llms"
)

func maxTokensFor(t *testing.T, pc *ProviderConfig, optType ProviderOptionsType) int {
	t.Helper()

	var call llms.CallOptions
	for _, option := range pc.GetOptionsForType(optType) {
		option(&call)
	}

	if call.MaxTokens == nil {
		return 0
	}

	return *call.MaxTokens
}

func loadConfig(t *testing.T, yaml string) *ProviderConfig {
	t.Helper()

	pc, err := LoadConfigData([]byte(yaml), nil)
	if err != nil {
		t.Fatalf("LoadConfigData: %v", err)
	}

	return pc
}

// The reporter emits the whole findings array in one response and needs a much larger
// token ceiling than the other "simple" callers (flow title, language detection, image
// chooser). It therefore has its own options profile. These tests guard both halves of
// that contract: raising the reporter must not raise anything else, and a provider that
// defines no "reporter" block must behave exactly as it did before the type existed.
func TestReporterProfileDoesNotAffectSimple(t *testing.T) {
	pc := loadConfig(t, `
simple:
  model: "m"
  max_tokens: 8192
  price:
    input: 1.0
    output: 2.0
reporter:
  model: "m"
  max_tokens: 32768
  price:
    input: 1.0
    output: 2.0
`)

	if got := maxTokensFor(t, pc, OptionsTypeReporter); got != 32768 {
		t.Errorf("reporter max_tokens = %d, want 32768", got)
	}

	// The whole point of the separate profile: every other caller is untouched.
	if got := maxTokensFor(t, pc, OptionsTypeSimple); got != 8192 {
		t.Errorf("simple max_tokens = %d, want 8192 (reporter must not leak into simple)", got)
	}
}

func TestReporterFallsBackToSimpleWhenUndefined(t *testing.T) {
	pc := loadConfig(t, `
simple:
  model: "m"
  max_tokens: 8192
  price:
    input: 1.0
    output: 2.0
`)

	// Providers with no "reporter" block keep their previous behaviour exactly.
	if got := maxTokensFor(t, pc, OptionsTypeReporter); got != 8192 {
		t.Errorf("reporter fallback max_tokens = %d, want 8192 (simple)", got)
	}

	if price := pc.GetPriceInfoForType(OptionsTypeReporter); price == nil {
		t.Error("reporter price must fall back to simple price, got nil")
	}
}
