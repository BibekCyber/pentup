package providers

import (
	"context"
	"errors"
	"strings"
	"sync"
	"testing"

	"pentagi/pkg/database"
	"pentagi/pkg/providers/pconfig"
	"pentagi/pkg/providers/provider"
	"pentagi/pkg/providers/tester/mock"
	"pentagi/pkg/templates"

	"github.com/stretchr/testify/require"
	"github.com/vxcontrol/langchaingo/llms"
	"github.com/vxcontrol/langchaingo/llms/streaming"
)

type summaryTestProvider struct {
	provider.Provider
	calls   int
	err     error
	config  string
	content string
}

func (p *summaryTestProvider) GetRawConfig() []byte { return []byte(p.config) }
func (p *summaryTestProvider) CallEx(context.Context, pconfig.ProviderOptionsType, []llms.MessageContent, streaming.Callback) (*llms.ContentResponse, error) {
	p.calls++
	if p.err != nil {
		return nil, p.err
	}
	return &llms.ContentResponse{Choices: []*llms.ContentChoice{{Content: p.content}}}, nil
}

type summaryTestDB struct {
	database.Querier
	writes int
	err    error
}

func (d *summaryTestDB) CreateMsgChain(context.Context, database.CreateMsgChainParams) (database.Msgchain, error) {
	d.writes++
	return database.Msgchain{}, d.err
}

func summaryFixture() (*flowProvider, *summaryTestProvider, *summaryTestDB) {
	p := &summaryTestProvider{Provider: mock.NewProvider(provider.ProviderKimi, "kimi", "model-a"), config: "a", content: "summary"}
	d := &summaryTestDB{}
	fp := newFlowProvider()
	fp.Provider = p
	fp.db = d
	fp.prompter = templates.NewDefaultPrompter()
	fp.language = "English"
	fp.summarizerCache = newSummarizerCache()
	return fp, p, d
}

func TestSummaryCache_ReusesOnlyMatchingContext(t *testing.T) {
	fp, p, d := summaryFixture()
	task, subtask := int64(1), int64(2)
	handler := fp.GetSummarizeResultHandler(&task, &subtask)
	get := func(input string) {
		t.Helper()
		got, err := handler(context.Background(), input)
		require.NoError(t, err)
		require.Equal(t, "summary", got)
	}
	get("input")
	get("input")
	require.Equal(t, 1, p.calls)
	require.Equal(t, 1, d.writes, "a cache hit creates no billable chain")
	get("changed input")
	require.Equal(t, 2, p.calls)
	subtask = 3
	get("input")
	require.Equal(t, 3, p.calls)
	task = 4
	get("input")
	require.Equal(t, 4, p.calls)
	fp.language = "Spanish"
	get("input")
	require.Equal(t, 5, p.calls)
	p.config = "different settings"
	get("input")
	require.Equal(t, 6, p.calls)
	p.Provider = mock.NewProvider(provider.ProviderKimi, "kimi", "model-b")
	get("input")
	require.Equal(t, 7, p.calls)
	other, _, _ := summaryFixture()
	other.Provider = p
	_, err := other.GetSummarizeResultHandler(&task, &subtask)(context.Background(), "input")
	require.NoError(t, err)
	require.Equal(t, 8, p.calls, "another flow must not reuse this flow's summaries")
}

func TestSummaryCache_HashesFullInputBeforeTruncation(t *testing.T) {
	fp, p, _ := summaryFixture()
	handler := fp.GetSummarizeResultHandler(nil, nil)
	// Both inputs are identical after the existing head/tail chop, but their
	// omitted evidence differs. They must never collide in the cache.
	prefix, suffix := strings.Repeat("a", msgSummarizerLimit), strings.Repeat("z", msgSummarizerLimit)
	_, err := handler(context.Background(), prefix+"first middle"+suffix)
	require.NoError(t, err)
	_, err = handler(context.Background(), prefix+"other middle"+suffix)
	require.NoError(t, err)
	require.Equal(t, 2, p.calls)
}

func TestSummaryCache_DoesNotCacheFailuresOrEmptySummaries(t *testing.T) {
	for _, failure := range []string{"provider", "database", "empty"} {
		t.Run(failure, func(t *testing.T) {
			fp, p, d := summaryFixture()
			handler := fp.GetSummarizeResultHandler(nil, nil)
			switch failure {
			case "provider":
				p.err = errors.New("API returned unexpected status code: 400: rejected")
			case "database":
				d.err = errors.New("database unavailable")
			case "empty":
				p.content = " "
			}
			_, err := handler(context.Background(), "input")
			if failure != "empty" {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
			}
			p.err = nil
			d.err = nil
			p.content = "summary"
			got, err := handler(context.Background(), "input")
			require.NoError(t, err)
			require.Equal(t, "summary", got)
			require.Equal(t, 2, p.calls)
		})
	}
}

func TestSummaryCache_BoundedAndCancellationAware(t *testing.T) {
	fp, p, _ := summaryFixture()
	handler := fp.GetSummarizeResultHandler(nil, nil)
	for i := 0; i <= summarizerCacheMaxSize; i++ {
		_, err := handler(context.Background(), strings.Repeat("x", i))
		require.NoError(t, err)
	}
	require.Equal(t, summarizerCacheMaxSize, fp.summarizerCache.Len())
	_, err := handler(context.Background(), "")
	require.NoError(t, err)
	require.Equal(t, summarizerCacheMaxSize+2, p.calls, "oldest entry was evicted")
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	_, err = handler(ctx, "")
	require.ErrorIs(t, err, context.Canceled)
	require.Equal(t, summarizerCacheMaxSize+2, p.calls)
}

func TestSummaryCache_ConcurrentHits(t *testing.T) {
	fp, p, d := summaryFixture()
	handler := fp.GetSummarizeResultHandler(nil, nil)
	_, err := handler(context.Background(), "input")
	require.NoError(t, err)
	var wg sync.WaitGroup
	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			got, err := handler(context.Background(), "input")
			if err != nil || got != "summary" {
				t.Errorf("hit = %q, %v", got, err)
			}
		}()
	}
	wg.Wait()
	require.Equal(t, 1, p.calls)
	require.Equal(t, 1, d.writes)
}
