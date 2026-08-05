// Command rptester exercises the reporter agent's system prompt (reporter.tmpl)
// against a real LLM, so the structured-findings quality can be validated without
// running a full scan. It renders the exact production system prompt, feeds a
// realistic evidence-rich task context, forces the report_result tool, and prints
// the returned findings with depth metrics. Not part of the app; run manually:
//
//	go run ./cmd/rptester -env ../.env -provider kimi
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"
	"text/template"
	"time"

	"pentagi/pkg/config"
	"pentagi/pkg/system"
	"pentagi/pkg/templates"
	"pentagi/pkg/tools"

	"github.com/joho/godotenv"
	"github.com/vxcontrol/langchaingo/llms"
	"github.com/vxcontrol/langchaingo/llms/openai"
)

// flexSlice accepts either a JSON array of strings or a single string (which the
// model sometimes returns for array-typed fields). It records which form arrived so
// the harness can flag when the model returned a string where the schema wants an
// array — that is exactly the shape mismatch that triggers the production toolcall
// fixer's extra round-trip.
type flexSlice struct {
	Items     []string
	WasString bool
}

func (f *flexSlice) UnmarshalJSON(b []byte) error {
	b = bytes.TrimSpace(b)
	if len(b) == 0 || string(b) == "null" {
		return nil
	}
	if b[0] == '[' {
		return json.Unmarshal(b, &f.Items)
	}
	var s string
	if err := json.Unmarshal(b, &s); err != nil {
		return err
	}
	f.Items = []string{s}
	f.WasString = true
	return nil
}

type hFinding struct {
	Title            string    `json:"title"`
	Severity         string    `json:"severity"`
	CVSS             *float64  `json:"cvss"`
	AffectedURLs     flexSlice `json:"affected_urls"`
	Description      string    `json:"description"`
	Impact           flexSlice `json:"impact"`
	StepsToReproduce flexSlice `json:"steps_to_reproduce"`
	Recommendation   string    `json:"recommendation"`
	References       flexSlice `json:"references"`
}

type hResult struct {
	Success  bool       `json:"success"`
	Message  string     `json:"message"`
	Findings []hFinding `json:"findings"`
}

// A realistic completed-task context, in the same XML shape task_reporter.tmpl
// produces, with concrete evidence so the model has real material to write
// auditor-grade findings from (never fabricate — everything below is "observed").
const userTask = `<user_task>
Audit the authentication and session-management flows of the in-scope web application at https://sub.client.com and its API at https://sub.client.com/api. Identify and evidence any vulnerabilities that affect confidentiality, integrity or availability of user accounts and data.
</user_task>

<completed_subtasks>
- Mapped the authentication surface: POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me, POST /api/auth/refresh.
- Tested JWT/session lifecycle, brute-force protections, transport security and error handling.
</completed_subtasks>

<execution_logs>
[1] Logout does not revoke the access token.
    $ curl -s -X POST https://sub.client.com/api/auth/logout -H "Authorization: Bearer eyJ...W" -o /dev/null -w "%{http_code}\n"
    200
    $ curl -s https://sub.client.com/api/auth/me -H "Authorization: Bearer eyJ...W"
    HTTP/2 200
    {"id":33,"email":"dietitian@client.com","role":"TEACHER"}
    Observation: the SAME token issued before logout still authenticates to /api/auth/me after a 200 logout. Server keeps no denylist; JWT exp is 24h. Tested repeatedly over 15 minutes post-logout, always 200.

[2] No rate limiting or lockout on login.
    Sent 60 sequential POST /api/auth/login requests with wrong passwords for a known user in ~9 seconds.
    Responses: 59x HTTP 401 {"error":"invalid credentials"}, 0x HTTP 429, no account lockout, no CAPTCHA, no backoff.
    x-ratelimit-* headers absent on every response.

[3] Missing transport/security headers on all API and app responses.
    $ curl -sI https://sub.client.com/api/auth/me -H "Authorization: Bearer eyJ...W"
    HTTP/2 200
    content-type: application/json; charset=utf-8
    (no strict-transport-security, no content-security-policy, no x-frame-options, no x-content-type-options)
    Confirmed across /, /login and all /api/* responses.

[4] Verbose error disclosure on malformed input.
    $ curl -s https://sub.client.com/api/auth/refresh -H "Content-Type: application/json" -d '{"token":'
    HTTP/2 500
    {"error":"SyntaxError: Unexpected end of JSON input\n    at JSON.parse (<anonymous>)\n    at /srv/app/node_modules/body-parser/lib/types/json.js:158:10","stack":"...","node":"v18.17.1","app":"client-api@2.4.0"}
    Observation: unhandled exceptions return full stack traces, absolute server paths, Node.js and application version.
</execution_logs>`

// Per-finding depth targets, measured from the client's reference report by
// extracting each finding's sections and averaging total characters per finding.
// Section totals (not per-item) so they compare like-for-like with the rendered PDF.
var targets = map[string]int{
	"desc":   830,
	"impact": 529,
	"steps":  664,
	"rec":    544,
	"refs":   457,
}

func main() {
	envFile := flag.String("env", "../.env", "Path to environment file")
	model := flag.String("model", "kimi-k2.5", "Kimi model id (see /v1/models on the endpoint)")
	inputFile := flag.String("input", "", "Path to a real reporter human-message (e.g. extracted from a DB msgchain); uses the built-in scenario when empty")
	tmplFile := flag.String("tmpl", "", "Path to an ALTERNATIVE reporter template to test (rendered with the production params); uses the embedded production reporter.tmpl when empty")
	runs := flag.Int("runs", 1, "Number of independent LLM runs to average (stability check)")
	quiet := flag.Bool("quiet", false, "Print only the per-run and aggregate metrics, not the full finding bodies")
	// Production runs the reporter as agent type "simple", whose kimi config.yml sets
	// max_tokens: 8192 — the ceiling for ALL findings + result + message in one
	// response. Mirror it here so the harness measures what production can actually
	// produce; raise it to test whether the cap (not the prompt) is the limiter.
	maxTokens := flag.Int("maxtokens", 8192, "max_tokens for the completion (production 'simple' = 8192)")
	temperature := flag.Float64("temp", 0.3, "temperature (production 'simple' = 0.3)")
	flag.Parse()

	human := userTask
	if *inputFile != "" {
		b, err := os.ReadFile(*inputFile)
		if err != nil {
			log.Fatalf("read input: %v", err)
		}
		human = string(b)
	}

	if err := godotenv.Load(*envFile); err != nil {
		log.Printf("warning: could not load %s: %v", *envFile, err)
	}

	cfg, err := config.NewConfig()
	if err != nil {
		log.Fatalf("load config: %v", err)
	}
	if cfg.KimiAPIKey == "" || cfg.KimiServerURL == "" {
		log.Fatalf("KIMI_API_KEY / KIMI_SERVER_URL must be set in %s", *envFile)
	}

	httpClient, err := system.GetHTTPClient(cfg)
	if err != nil {
		log.Fatalf("http client: %v", err)
	}
	// Same OpenAI-compatible client the kimi provider builds, but with a selectable
	// model (the provider hardwires kimi-k2-turbo-preview, which this key lacks).
	llm, err := openai.New(
		openai.WithToken(cfg.KimiAPIKey),
		openai.WithModel(*model),
		openai.WithBaseURL(cfg.KimiServerURL),
		openai.WithHTTPClient(httpClient),
		openai.WithPreserveReasoningContent(),
	)
	if err != nil {
		log.Fatalf("build llm client: %v", err)
	}

	params := map[string]any{
		// Must mirror the production reporter context in providers/provider.go —
		// omitting FindingsSpec silently renders the findings requirements as empty.
		"FindingsSpec":            templates.StructuredFindingsSpec,
		"ReportResultToolName":    tools.ReportResultToolName,
		"SummarizationToolName":   "summarized_content",
		"SummarizedContentPrefix": "[summarized]",
		"Lang":                    "English",
		"N":                       4000,
		"ToolPlaceholder":         "",
	}

	// Either the production reporter.tmpl (embedded) or a candidate variant file,
	// rendered with the identical params so the comparison is apples-to-apples.
	var systemPrompt string
	if *tmplFile != "" {
		raw, err := os.ReadFile(*tmplFile)
		if err != nil {
			log.Fatalf("read tmpl: %v", err)
		}
		t, err := template.New("variant").Parse(string(raw))
		if err != nil {
			log.Fatalf("parse tmpl: %v", err)
		}
		var buf bytes.Buffer
		if err := t.Execute(&buf, params); err != nil {
			log.Fatalf("execute tmpl: %v", err)
		}
		systemPrompt = buf.String()
	} else {
		prompter := templates.NewDefaultPrompter()
		systemPrompt, err = prompter.RenderTemplate(templates.PromptTypeReporter, params)
		if err != nil {
			log.Fatalf("render reporter.tmpl: %v", err)
		}
	}

	// Guard against silently measuring a prompt whose findings requirements failed to
	// render (a missing template param renders as empty, which looks like a huge quality
	// regression in the metrics but is really a harness bug).
	if !strings.Contains(systemPrompt, "Required content of each field") {
		log.Fatalf("rendered prompt is missing the findings spec — check the template params")
	}

	// The report_result tool, exactly as the reporter executor registers it.
	def := tools.GetRegistryDefinitions()[tools.ReportResultToolName]
	tool := llms.Tool{Type: "function", Function: &def}

	chain := []llms.MessageContent{
		llms.TextParts(llms.ChatMessageTypeSystem, systemPrompt),
		llms.TextParts(llms.ChatMessageTypeHuman, human),
	}

	label := "production reporter.tmpl"
	if *tmplFile != "" {
		label = *tmplFile
	}
	fmt.Printf("== reporter prompt validation (model=%s, prompt=%s, runs=%d) ==\n\n", *model, label, *runs)

	var all []hFinding
	totalShape := 0
	var totalIn, totalOut, okRuns int
	var totalWall time.Duration
	for run := 1; run <= *runs; run++ {
		started := time.Now()
		resp, err := llm.GenerateContent(context.Background(), chain,
			llms.WithTools([]llms.Tool{tool}),
			llms.WithMaxTokens(*maxTokens),
			llms.WithTemperature(*temperature))
		elapsed := time.Since(started)
		if err != nil {
			log.Printf("run %d: GenerateContent failed: %v", run, err)
			continue
		}
		okRuns++
		totalWall += elapsed
		if len(resp.Choices) > 0 {
			gi := resp.Choices[0].GenerationInfo
			if v, ok := gi["PromptTokens"].(int); ok {
				totalIn += v
			}
			if v, ok := gi["CompletionTokens"].(int); ok {
				totalOut += v
			}
		}

		var raw string
		for _, ch := range resp.Choices {
			for _, tc := range ch.ToolCalls {
				if tc.FunctionCall != nil && tc.FunctionCall.Name == tools.ReportResultToolName {
					raw = tc.FunctionCall.Arguments
				}
			}
			if raw == "" && ch.FuncCall != nil && ch.FuncCall.Name == tools.ReportResultToolName {
				raw = ch.FuncCall.Arguments
			}
		}
		if raw == "" {
			log.Printf("run %d: model did not call %s", run, tools.ReportResultToolName)
			continue
		}

		var result hResult
		if err := json.Unmarshal([]byte(raw), &result); err != nil {
			log.Printf("run %d: unmarshal failed: %v", run, err)
			continue
		}

		shape := 0
		for _, f := range result.Findings {
			shape += len(shapeIssues(f))
		}
		totalShape += shape
		all = append(all, result.Findings...)

		fmt.Printf("RUN %d: findings=%d  ", run, len(result.Findings))
		printMetrics(result.Findings)

		if !*quiet {
			for i, f := range result.Findings {
				cvss := "-"
				if f.CVSS != nil {
					cvss = fmt.Sprintf("%.1f", *f.CVSS)
				}
				fmt.Printf("────────────────────────────────────────────────────────\n")
				fmt.Printf("[%d] %s (severity=%s cvss=%s)\n\n", i+1, f.Title, f.Severity, cvss)
				fmt.Printf("  DESCRIPTION:\n%s\n\n", indent(f.Description))
				fmt.Printf("  BUSINESS IMPACT:\n%s\n", bullets(f.Impact.Items))
				fmt.Printf("  STEPS TO REPRODUCE:\n%s\n", bullets(f.StepsToReproduce.Items))
				fmt.Printf("  RECOMMENDATION:\n%s\n\n", indent(f.Recommendation))
				fmt.Printf("  REFERENCES:\n%s\n", bullets(f.References.Items))
			}
		}
	}

	fmt.Printf("\n════════════════════════════════════════════════════════\n")
	if len(all) == 0 {
		log.Fatalf("no successful runs")
	}
	if okRuns > 0 {
		// Cost/latency of the reporter call itself, so a depth change can be judged
		// against what it actually costs per report rather than guessed at.
		const inPricePerM, outPricePerM = 0.60, 3.00 // kimi-k2.5 USD per 1M tokens
		avgIn, avgOut := totalIn/okRuns, totalOut/okRuns
		cost := (float64(avgIn)*inPricePerM + float64(avgOut)*outPricePerM) / 1e6
		fmt.Printf("COST/LATENCY per reporter call: in=%d out=%d tokens, %.1fs, $%.4f\n",
			avgIn, avgOut, (totalWall / time.Duration(okRuns)).Seconds(), cost)
	}
	fmt.Printf("AGGREGATE over %d finding(s) from %d run(s)\n", len(all), *runs)
	printMetrics(all)
	printTargetTable(all)
	if totalShape == 0 {
		fmt.Printf("SHAPE: clean — all array fields returned as arrays.\n")
	} else {
		fmt.Printf("SHAPE: %d warning(s) — array field(s) returned as a single string.\n", totalShape)
	}
}

// sectionTotals returns per-finding TOTAL characters for each report section,
// matching how the client reference report was measured from its rendered PDF.
func sectionTotals(f hFinding) map[string]int {
	sum := func(items []string) int {
		n := 0
		for _, s := range items {
			n += len(s)
		}
		return n
	}
	return map[string]int{
		"desc":   len(f.Description),
		"impact": sum(f.Impact.Items),
		"steps":  sum(f.StepsToReproduce.Items),
		"rec":    len(f.Recommendation),
		"refs":   sum(f.References.Items),
	}
}

func averages(fs []hFinding) map[string]int {
	acc := map[string]int{}
	for _, f := range fs {
		for k, v := range sectionTotals(f) {
			acc[k] += v
		}
	}
	for k := range acc {
		acc[k] /= len(fs)
	}
	return acc
}

func printMetrics(fs []hFinding) {
	if len(fs) == 0 {
		fmt.Printf("(no findings)\n")
		return
	}
	a := averages(fs)
	fmt.Printf("DEPTH desc=%d impact=%d steps=%d rec=%d refs=%d (avg chars/finding)\n",
		a["desc"], a["impact"], a["steps"], a["rec"], a["refs"])
}

// printTargetTable shows each section against the client reference target and
// whether the variant meets it (>= 100% of target).
func printTargetTable(fs []hFinding) {
	a := averages(fs)
	order := []struct{ key, name string }{
		{"desc", "Description"},
		{"impact", "Business Impact"},
		{"steps", "Steps to Reproduce"},
		{"rec", "Recommendation"},
		{"refs", "References"},
	}
	pass := 0
	fmt.Printf("\n  %-20s %8s %8s %7s  %s\n", "SECTION", "OURS", "TARGET", "PCT", "VERDICT")
	for _, o := range order {
		got, want := a[o.key], targets[o.key]
		pct := got * 100 / want
		verdict := "SHORT"
		if pct >= 100 {
			verdict = "PASS"
			pass++
		}
		fmt.Printf("  %-20s %8d %8d %6d%%  %s\n", o.name, got, want, pct, verdict)
	}
	fmt.Printf("  => %d/5 sections at or above the client reference\n\n", pass)
}

// shapeIssues flags array-typed fields the model returned as a single string.
func shapeIssues(f hFinding) []string {
	var out []string
	if f.Impact.WasString {
		out = append(out, "impact returned as a single string, not an array")
	}
	if f.StepsToReproduce.WasString {
		out = append(out, "steps_to_reproduce returned as a single string, not an array")
	}
	if f.References.WasString {
		out = append(out, "references returned as a single string, not an array")
	}
	if f.AffectedURLs.WasString {
		out = append(out, "affected_urls returned as a single string, not an array")
	}
	return out
}

func firstContent(resp *llms.ContentResponse) string {
	if resp == nil || len(resp.Choices) == 0 {
		return "(empty)"
	}
	return resp.Choices[0].Content
}

func wordCount(s string) int {
	if strings.TrimSpace(s) == "" {
		return 0
	}
	return len(strings.Fields(s))
}

func indent(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return "    (empty)"
	}
	lines := strings.Split(s, "\n")
	for i := range lines {
		lines[i] = "    " + lines[i]
	}
	return strings.Join(lines, "\n")
}

func bullets(items []string) string {
	if len(items) == 0 {
		return "    (none)\n"
	}
	var b strings.Builder
	for _, it := range items {
		b.WriteString("    • " + strings.TrimSpace(it) + "\n")
	}
	return b.String()
}
