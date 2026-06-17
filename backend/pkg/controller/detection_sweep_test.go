package controller

import (
	"context"
	"database/sql"
	"encoding/json"
	"os"
	"testing"
	"time"

	"pentagi/pkg/config"
	"pentagi/pkg/database"
	"pentagi/pkg/docker"
	"pentagi/pkg/providers"
	"pentagi/pkg/providers/provider"
	"pentagi/pkg/tools"

	_ "github.com/lib/pq"
	"github.com/stretchr/testify/require"
)

// TestReconRobustness exercises the passive recon probe against varied and
// malformed inputs to confirm it normalises hosts correctly and never crashes —
// failing/unreachable targets must come back as a structured "unreachable"
// result, not an error or panic. Network-gated behind RUN_DETECT_SWEEP.
//
//	RUN_DETECT_SWEEP=1 go test ./pkg/controller/ -run TestReconRobustness -v -count=1
func TestReconRobustness(t *testing.T) {
	if os.Getenv("RUN_DETECT_SWEEP") == "" {
		t.Skip("set RUN_DETECT_SWEEP=1 to run live recon")
	}

	ua := "PentAGI/1.0 (+https://pentagi.com)"
	inputs := []string{
		"github.com",                  // bare host
		"https://github.com/any/path", // scheme + path stripped
		"github.com:443",              // port stripped
		"EN.WIKIPEDIA.ORG",            // upper-cased
		"http://example.com",          // http scheme
		"1.1.1.1",                     // bare IP literal
		"this-domain-zzzq.invalid",    // unresolvable
		"   spaced.dev   ",            // surrounding whitespace
	}

	for _, in := range inputs {
		recon, err := tools.RunRecon(context.Background(), in, ua)
		require.NoError(t, err, "recon must not error for %q", in)
		require.NotNil(t, recon)

		host, _ := recon["domain"].(string)
		http, _ := recon["http"].(map[string]interface{})
		tls, _ := recon["tls"].(map[string]interface{})
		t.Logf("input=%-30q -> host=%-22q http.reachable=%v tls.reachable=%v",
			in, host, http["reachable"], tls["reachable"])
	}
}

// TestDetectionSweep runs the real recon + classifier pipeline against a varied
// set of live targets and prints the detected target type, confidence and
// rationale. It is an opt-in live integration test (it makes outbound network
// calls and one LLM call per target), so it is skipped unless RUN_DETECT_SWEEP=1.
//
//	RUN_DETECT_SWEEP=1 DETECT_PROVIDER=kimi go test ./pkg/controller/ -run TestDetectionSweep -v -count=1 -timeout=20m
func TestDetectionSweep(t *testing.T) {
	if os.Getenv("RUN_DETECT_SWEEP") == "" {
		t.Skip("set RUN_DETECT_SWEEP=1 to run the live detection sweep")
	}

	cfg, err := config.NewConfig()
	require.NoError(t, err)
	if p := os.Getenv("DETECT_PROVIDER"); p != "" {
		cfg.DomainClassifierProvider = p
	}
	t.Logf("classifier provider: %q", cfg.DomainClassifierProvider)

	sqldb, err := sql.Open("postgres", cfg.DatabaseURL)
	require.NoError(t, err)
	defer sqldb.Close()
	require.NoError(t, sqldb.Ping())
	queries := database.New(sqldb)

	ctx := context.Background()
	dockerClient, err := docker.NewDockerClient(ctx, queries, cfg)
	require.NoError(t, err)

	provs, err := providers.NewProviderController(cfg, queries, dockerClient)
	require.NoError(t, err)

	classifier := newDomainClassifier(cfg, provs)
	fallback := provider.ProviderName(cfg.DomainClassifierProvider)

	cases := []struct {
		domain string
		expect string
	}{
		// web apps (human-facing sites)
		{"github.com", "web_app"},
		{"bidheyakthapa.com.np", "web_app"},
		{"en.wikipedia.org", "web_app"},
		{"news.ycombinator.com", "web_app"},
		{"stackoverflow.com", "web_app"},
		{"cloudflare.com", "web_app"},
		{"example.com", "web_app"},
		// machine-facing HTTP APIs
		{"api.github.com", "api"},
		{"jsonplaceholder.typicode.com", "api"},
		{"httpbin.org", "api"},
		{"api.stripe.com", "api"},
		{"pokeapi.co", "api"},
		// AWS infrastructure endpoints
		{"s3.amazonaws.com", "aws"},
		{"ec2.amazonaws.com", "aws"},
		{"dynamodb.us-east-1.amazonaws.com", "aws"},
		// GCP infrastructure endpoints
		{"storage.googleapis.com", "gcp"},
		{"bigquery.googleapis.com", "gcp"},
		{"www.googleapis.com", "gcp"},
		// Azure infrastructure endpoints
		{"management.azure.com", "azure"},
		{"login.microsoftonline.com", "azure"},
		// unresolved / inconclusive
		{"this-domain-does-not-exist-zzzq.invalid", "general"},
	}

	type result struct {
		domain     string
		expect     string
		got        string
		confidence float64
		rationale  string
		provider   string
		match      bool
	}

	results := make([]result, 0, len(cases))
	for _, tc := range cases {
		start := time.Now()
		got, metaRaw := classifier.Classify(ctx, 1, tc.domain, fallback)

		var meta struct {
			Confidence float64 `json:"confidence"`
			Provider   string  `json:"provider"`
			Rationale  string  `json:"rationale"`
		}
		_ = json.Unmarshal(metaRaw, &meta)

		r := result{
			domain:     tc.domain,
			expect:     tc.expect,
			got:        got,
			confidence: meta.Confidence,
			rationale:  meta.Rationale,
			provider:   meta.Provider,
			match:      got == tc.expect,
		}
		results = append(results, r)
		t.Logf("[%-7s] %-32s expect=%-14s got=%-14s conf=%.2f (%s) — %s",
			func() string {
				if r.match {
					return "MATCH"
				}
				return "MISS"
			}(), tc.domain, tc.expect, got, meta.Confidence, time.Since(start).Round(time.Millisecond), meta.Rationale)
	}

	matches := 0
	for _, r := range results {
		if r.match {
			matches++
		}
	}

	t.Logf("==================== DETECTION SWEEP RESULTS ====================")
	t.Logf("%-32s %-14s %-14s %-6s %-7s %s", "DOMAIN", "EXPECTED", "DETECTED", "CONF", "RESULT", "RATIONALE")
	for _, r := range results {
		verdict := "MISS"
		if r.match {
			verdict = "ok"
		}
		t.Logf("%-32s %-14s %-14s %-6.2f %-7s %s", r.domain, r.expect, r.got, r.confidence, verdict, r.rationale)
	}
	t.Logf("================================================================")
	t.Logf("Accuracy: %d/%d correct (%.0f%%) using provider=%q",
		matches, len(results), 100*float64(matches)/float64(len(results)), cfg.DomainClassifierProvider)
}
