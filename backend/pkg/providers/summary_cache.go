package providers

import (
	"crypto/sha256"
	"encoding/json"

	"pentagi/pkg/providers/pconfig"

	lru "github.com/hashicorp/golang-lru/v2"
)

const summarizerCacheMaxSize = 100

// Like upstream, keep a bounded, concurrent-safe LRU on each flow/assistant
// provider. Non-expiring entries avoid a cleanup goroutine per provider instance.
func newSummarizerCache() *lru.Cache[[32]byte, string] {
	cache, _ := lru.New[[32]byte, string](summarizerCacheMaxSize)
	return cache
}

func (fp *flowProvider) summaryCacheKey(input, systemPrompt string) [32]byte {
	// The prompt includes task/subtask IDs. Language and provider configuration
	// prevent reuse after a model, profile, or language change in the same flow.
	key, _ := json.Marshal([]string{
		input, systemPrompt, fp.language, fp.Type().String(), fp.Name().String(),
		fp.ModelWithPrefix(pconfig.OptionsTypeSimple), string(fp.GetRawConfig()),
	})
	return sha256.Sum256(key)
}
