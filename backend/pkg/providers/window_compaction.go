package providers

import (
	"context"

	"pentagi/pkg/csum"
	"pentagi/pkg/providers/pconfig"
	"pentagi/pkg/providers/provider"
	"pentagi/pkg/tools"

	"github.com/vxcontrol/langchaingo/llms"
)

// compactChainForWindow proactively compacts a message chain to fit the model's
// configured context window (models.yml `context_window`) BEFORE it is sent to
// the LLM. It is a no-op when the model declares no window or the chain already
// fits. When it does compact, it summarizes (preserving the recent turns and a
// Q&A digest) to a window-derived byte budget rather than hard-truncating, so a
// runaway context (e.g. a subtask's first call inheriting the whole task history)
// is bounded without losing the salient content.
func compactChainForWindow(
	ctx context.Context,
	prv provider.Provider,
	opt pconfig.ProviderOptionsType,
	chain []llms.MessageContent,
	schemas []llms.Tool,
	handler tools.SummarizeHandler,
	tcIDTemplate string,
) ([]llms.MessageContent, bool) {
	window := provider.ModelLimitsFor(prv, opt).ContextWindow
	if window == nil || provider.ChainFitsWindow(chain, schemas, *window) {
		return chain, false
	}

	budget := provider.ChainByteBudget(*window, schemas)
	if budget <= 0 {
		return chain, false
	}

	compacted, err := csum.NewSummarizer(csum.SummarizerConfig{
		PreserveLast:   true,
		UseQA:          true,
		LastSecBytes:   budget / 2,
		MaxBPBytes:     budget / 4,
		MaxQABytes:     budget,
		KeepQASections: 1,
	}).SummarizeChain(ctx, handler, chain, tcIDTemplate)
	if err != nil {
		return chain, false
	}

	return compacted, true
}
