package providers

import (
	"context"
	"strings"
	"testing"

	"pentagi/pkg/providers/pconfig"
	"pentagi/pkg/providers/provider"
	"pentagi/pkg/providers/tester/mock"

	"github.com/stretchr/testify/assert"
	"github.com/vxcontrol/langchaingo/llms"
)

func wcWindow(v int) *int { return &v }

// wcChain builds a chain of `turns` human/AI message pairs, each carrying `size`
// bytes of text, so the QA summarizer has compactable conversation turns.
func wcChain(turns, size int) []llms.MessageContent {
	chain := make([]llms.MessageContent, 0, turns*2)
	for i := 0; i < turns; i++ {
		chain = append(chain,
			llms.TextParts(llms.ChatMessageTypeHuman, "question "+strings.Repeat("q", size)),
			llms.TextParts(llms.ChatMessageTypeAI, "answer "+strings.Repeat("a", size)),
		)
	}
	return chain
}

func wcBytes(chain []llms.MessageContent) int {
	total := 0
	for _, msg := range chain {
		for _, part := range msg.Parts {
			if t, ok := part.(llms.TextContent); ok {
				total += len(t.Text)
			}
		}
	}
	return total
}

func TestWindowCompaction_CompactChainForWindow(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		window   *int
		turns    int
		wantDone bool
	}{
		{name: "a chain that fits the window is left alone", window: wcWindow(200000), turns: 4},
		{name: "an unknown (nil) window leaves the chain alone", window: nil, turns: 40},
		{name: "a tiny window with no room for an answer leaves the chain alone", window: wcWindow(256), turns: 40},
		{name: "a chain far above the window is compacted", window: wcWindow(8000), turns: 40, wantDone: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			prv := mock.NewProvider(provider.ProviderOpenAI, "openai", "small-model")
			prv.SetModels(pconfig.ModelsConfig{{Name: "small-model", ContextWindow: tt.window}})

			handler := func(context.Context, string) (string, error) { return "short summary", nil }

			original := wcChain(tt.turns, 4000)
			originalBytes := wcBytes(original)
			compacted, done := compactChainForWindow(
				context.Background(), prv, pconfig.OptionsTypeSimple, original, nil, handler, "call_%d",
			)

			assert.Equal(t, tt.wantDone, done, "done")
			if tt.wantDone {
				assert.Less(t, wcBytes(compacted), originalBytes, "compacted chain should be smaller than the original")
			} else {
				assert.Equal(t, originalBytes, wcBytes(compacted), "chain should be unchanged")
			}
		})
	}
}
