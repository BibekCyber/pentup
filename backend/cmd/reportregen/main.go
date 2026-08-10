// Command reportregen re-runs ONLY the reporter stage for an existing flow and rewrites
// that flow's stored findings, so an improved reporter prompt can be applied to a scan
// that already ran without repeating the scan itself.
//
// It deliberately drives the application's own code path rather than calling the LLM
// directly: the provider is built through providers.NewProviderController (which loads the
// user's provider configuration from the database, not the embedded config.yml), and the
// findings come from FlowProvider.GetTaskResult / AssistantProvider.ExtractFindings — the
// exact functions production uses. Whatever the system really does, including its token
// ceiling and temperature, is what you observe here.
//
// It is read-only unless -apply is passed, and it always writes a JSON backup of the
// previous findings first.
//
//	go run ./cmd/reportregen -env ../.env -flow 22            # dry run
//	go run ./cmd/reportregen -env ../.env -flow 22 -apply     # rewrite findings
package main

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"pentagi/pkg/config"
	"pentagi/pkg/database"
	"pentagi/pkg/docker"
	"pentagi/pkg/providers"
	"pentagi/pkg/providers/provider"
	"pentagi/pkg/templates"
	"pentagi/pkg/tools"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

// Mirrors controller/assistant.go: the extractor sees the tail of the assistant's report
// and answer messages, capped so a long conversation cannot blow the context.
const assistantFindingsContentLimit = 60000

func main() {
	envFile := flag.String("env", ".env", "Path to environment file")
	flowID := flag.Int64("flow", 0, "Flow ID whose report should be regenerated")
	userID := flag.Int64("user", 1, "User ID owning the provider configuration")
	apply := flag.Bool("apply", false, "Write the regenerated findings back to the database")
	backupDir := flag.String("backup", "./report-backups", "Directory for pre-change findings backups")
	flag.Parse()

	if *flowID == 0 {
		log.Fatal("-flow is required")
	}

	if err := godotenv.Load(*envFile); err != nil {
		log.Printf("warning: could not load %s: %v", *envFile, err)
	}

	cfg, err := config.NewConfig()
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	db, err := sql.Open("postgres", cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("open database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("ping database: %v", err)
	}

	ctx := context.Background()
	queries := database.New(db)

	flow, err := queries.GetFlow(ctx, *flowID)
	if err != nil {
		log.Fatalf("get flow %d: %v", *flowID, err)
	}

	fmt.Printf("flow %d: %q (provider=%s/%s, model=%s)\n",
		flow.ID, flow.Title, flow.ModelProviderType, flow.ModelProviderName, flow.Model)
	if !*apply {
		fmt.Printf("DRY RUN — nothing will be written. Pass -apply to persist.\n")
	}
	fmt.Println()

	dockerClient, err := docker.NewDockerClient(ctx, queries, cfg)
	if err != nil {
		log.Fatalf("docker client: %v", err)
	}

	providerController, err := providers.NewProviderController(cfg, queries, dockerClient)
	if err != nil {
		log.Fatalf("provider controller: %v", err)
	}

	prompter := templates.NewDefaultPrompter()
	prvName := provider.ProviderName(flow.ModelProviderName)

	executor, err := tools.NewFlowToolsExecutor(queries, cfg, dockerClient, nil, flow.ID)
	if err != nil {
		log.Fatalf("flow tools executor: %v", err)
	}

	// The executor owns the log providers used while a tool call runs. Regeneration must
	// not append to a finished flow's visible history, so they are wired to no-ops here.
	executor.SetMsgLogProvider(noopMsgLog{})
	executor.SetAgentLogProvider(noopAgentLog{})

	if err := os.MkdirAll(*backupDir, 0o755); err != nil {
		log.Fatalf("create backup dir: %v", err)
	}

	tasks, err := queries.GetFlowTasks(ctx, flow.ID)
	if err != nil {
		log.Fatalf("get flow tasks: %v", err)
	}

	assistants, err := queries.GetFlowAssistants(ctx, flow.ID)
	if err != nil {
		log.Fatalf("get flow assistants: %v", err)
	}

	switch {
	case len(tasks) > 0:
		regenerateAutomation(ctx, queries, providerController, prompter, executor,
			prvName, flow, tasks, *userID, *apply, *backupDir)
	case len(assistants) > 0:
		regenerateAssistant(ctx, queries, providerController, prompter, executor,
			prvName, flow, assistants, *userID, *apply, *backupDir)
	default:
		log.Fatalf("flow %d has neither tasks nor assistants — nothing to regenerate", flow.ID)
	}
}

// regenerateAutomation re-runs the task reporter through FlowProvider.GetTaskResult, the
// same call the flow worker makes when a task finishes.
func regenerateAutomation(
	ctx context.Context,
	queries *database.Queries,
	pc providers.ProviderController,
	prompter templates.Prompter,
	executor tools.FlowToolsExecutor,
	prvName provider.ProviderName,
	flow database.Flow,
	tasks []database.Task,
	userID int64,
	apply bool,
	backupDir string,
) {
	fp, err := pc.LoadFlowProvider(ctx, prvName, prompter, executor,
		flow.ID, userID, false, containerImage(ctx, queries, flow.ID), flow.Language, flow.Title, flow.ToolCallIDTemplate)
	if err != nil {
		log.Fatalf("load flow provider: %v", err)
	}

	fp.SetMsgLogProvider(noopMsgLog{})
	fp.SetAgentLogProvider(noopAgentLog{})

	for _, task := range tasks {
		fmt.Printf("── task %d: %q\n", task.ID, task.Title)
		backup(backupDir, fmt.Sprintf("flow%d-task%d", flow.ID, task.ID), task.Findings)
		summarise("before", task.Findings)

		started := time.Now()
		result, err := fp.GetTaskResult(ctx, task.ID)
		if err != nil {
			log.Printf("   REPORTER FAILED after %s: %v", time.Since(started).Round(time.Second), err)
			continue
		}

		// Same guards production applies: the model may not assert an analyst decision,
		// and a regeneration must not silently erase one. Without these, the tool whose
		// whole purpose is regeneration would be the one thing that destroys triage.
		findings := tools.PrepareFindingsForStorage(decodeFindings(task.Findings), result.Findings)

		blob, err := json.Marshal(findings)
		if err != nil {
			log.Printf("   marshal findings: %v", err)
			continue
		}

		fmt.Printf("   reporter completed in %s\n", time.Since(started).Round(time.Second))
		summarise("after ", blob)

		if !apply {
			continue
		}

		// Never let a failed or degraded regeneration destroy a good report. The reporter
		// can return nothing (an overflowed response, a refused tool call), and writing
		// that over existing findings is pure data loss — refuse instead.
		if len(findings) == 0 {
			log.Printf("   REFUSING TO WRITE: reporter returned 0 findings; keeping the existing report")
			continue
		}

		if err := queries.UpdateTaskFindings(ctx, database.UpdateTaskFindingsParams{
			Findings: blob,
			ID:       task.ID,
		}); err != nil {
			log.Printf("   update task findings: %v", err)
			continue
		}

		fmt.Printf("   WROTE %d findings to tasks.findings\n", len(findings))
	}
}

// regenerateAssistant re-runs AssistantProvider.ExtractFindings over the assistant's own
// report and answer messages, rebuilt exactly as controller/assistant.go builds them.
func regenerateAssistant(
	ctx context.Context,
	queries *database.Queries,
	pc providers.ProviderController,
	prompter templates.Prompter,
	executor tools.FlowToolsExecutor,
	prvName provider.ProviderName,
	flow database.Flow,
	assistants []database.Assistant,
	userID int64,
	apply bool,
	backupDir string,
) {
	for _, assistant := range assistants {
		fmt.Printf("── assistant %d: %q\n", assistant.ID, assistant.Title)

		logs, err := queries.GetFlowAssistantLogs(ctx, database.GetFlowAssistantLogsParams{
			FlowID:      flow.ID,
			AssistantID: assistant.ID,
		})
		if err != nil {
			log.Printf("   get assistant logs: %v", err)
			continue
		}

		var sb strings.Builder
		for _, entry := range logs {
			if entry.Type != database.MsglogTypeReport && entry.Type != database.MsglogTypeAnswer {
				continue
			}

			message := strings.TrimSpace(entry.Message)
			if message == "" {
				continue
			}

			sb.WriteString(message)
			sb.WriteString("\n\n")
		}

		content := strings.TrimSpace(sb.String())
		if content == "" {
			log.Printf("   no report/answer content to extract from")
			continue
		}

		if len(content) > assistantFindingsContentLimit {
			content = content[len(content)-assistantFindingsContentLimit:]
		}

		fmt.Printf("   assessment content: %d chars from %d log entries\n", len(content), len(logs))
		backup(backupDir, fmt.Sprintf("flow%d-assistant%d", flow.ID, assistant.ID), assistant.Findings)
		summarise("before", assistant.Findings)

		ap, err := pc.LoadAssistantProvider(ctx, prvName, prompter, executor,
			assistant.ID, flow.ID, userID, containerImage(ctx, queries, flow.ID), assistant.Language,
			assistant.Title, assistant.ToolCallIDTemplate, nil)
		if err != nil {
			log.Printf("   load assistant provider: %v", err)
			continue
		}

		ap.SetMsgLogProvider(noopMsgLog{})
		ap.SetAgentLogProvider(noopAgentLog{})

		started := time.Now()
		findings, err := ap.ExtractFindings(ctx, content)
		if err != nil {
			log.Printf("   EXTRACTION FAILED after %s: %v", time.Since(started).Round(time.Second), err)
			continue
		}

		if findings == nil {
			findings = []tools.Finding{}
		}

		findings = tools.PrepareFindingsForStorage(decodeFindings(assistant.Findings), findings)

		blob, err := json.Marshal(findings)
		if err != nil {
			log.Printf("   marshal findings: %v", err)
			continue
		}

		fmt.Printf("   extraction completed in %s\n", time.Since(started).Round(time.Second))
		summarise("after ", blob)

		if !apply {
			continue
		}

		if len(findings) == 0 {
			log.Printf("   REFUSING TO WRITE: extraction returned 0 findings; keeping the existing report")
			continue
		}

		// The hash is what suppresses re-extraction for unchanged content; keep it in
		// step with the content these findings were derived from.
		if err := queries.UpdateAssistantFindings(ctx, database.UpdateAssistantFindingsParams{
			Findings:     blob,
			FindingsHash: fmt.Sprintf("%x", sha256Sum(content)),
			ID:           assistant.ID,
		}); err != nil {
			log.Printf("   update assistant findings: %v", err)
			continue
		}

		fmt.Printf("   WROTE %d findings to assistants.findings\n", len(findings))
	}
}

// summarise prints the per-section depth of a findings blob so before/after is comparable
// with the client reference report the prompt was tuned against.
func summarise(label string, blob []byte) {
	var findings []map[string]any
	if err := json.Unmarshal(blob, &findings); err != nil || len(findings) == 0 {
		fmt.Printf("   %s: 0 findings\n", label)
		return
	}

	total := map[string]int{}
	for _, f := range findings {
		total["desc"] += textLen(f["description"])
		total["impact"] += textLen(f["impact"])
		total["steps"] += textLen(f["steps_to_reproduce"])
		total["rec"] += textLen(f["recommendation"])
		total["refs"] += textLen(f["references"])
	}

	n := len(findings)
	fmt.Printf("   %s: %2d findings | desc=%d impact=%d steps=%d rec=%d refs=%d (avg chars)\n",
		label, n, total["desc"]/n, total["impact"]/n, total["steps"]/n, total["rec"]/n, total["refs"]/n)

	// Titles make a coverage change reviewable: a smaller count is only acceptable if the
	// dropped entries were duplicates or unevidenced, which requires seeing them.
	for _, f := range findings {
		title, _ := f["title"].(string)
		severity, _ := f["severity"].(string)
		fmt.Printf("        - [%s] %s\n", severity, title)
	}
}

func textLen(v any) int {
	switch t := v.(type) {
	case string:
		return len(t)
	case []any:
		n := 0
		for _, item := range t {
			if s, ok := item.(string); ok {
				n += len(s)
			}
		}
		return n
	default:
		return 0
	}
}

// backup keeps the pre-change findings. The first backup for a target is never
// overwritten: a later run would otherwise replace the original report with whatever the
// previous run wrote, destroying the only copy that can restore it.
func backup(dir, name string, blob []byte) {
	path := filepath.Join(dir, name+".json")
	if _, err := os.Stat(path); err == nil {
		stamped := filepath.Join(dir, fmt.Sprintf("%s.%d.json", name, time.Now().Unix()))
		if err := os.WriteFile(stamped, blob, 0o644); err != nil {
			log.Fatalf("backup %s: %v", stamped, err)
		}

		fmt.Printf("   original backup kept at %s; this run's state -> %s\n", path, stamped)

		return
	}

	if err := os.WriteFile(path, blob, 0o644); err != nil {
		log.Fatalf("backup %s: %v", path, err)
	}

	fmt.Printf("   backed up previous findings -> %s\n", path)
}

func sha256Sum(s string) [32]byte {
	return sha256.Sum256([]byte(s))
}

// containerImage reports the flow's primary container image, matching what the flow and
// assistant workers pass when they load a provider. The reporter never executes anything
// in a container, so a missing container is not fatal here.
func containerImage(ctx context.Context, queries *database.Queries, flowID int64) string {
	containers, err := queries.GetFlowContainers(ctx, flowID)
	if err != nil || len(containers) == 0 {
		return ""
	}

	return containers[0].Image
}

// Regeneration replays only the reporter stage, so it must not append to the flow's
// visible history: production wires real message and agent log providers that write chat
// entries, and reusing them here would inject duplicate messages into a finished flow.
// These no-ops satisfy the executor's dependencies while leaving the logs untouched.
type noopMsgLog struct{}

func (noopMsgLog) PutMsg(
	ctx context.Context,
	msgType database.MsglogType,
	taskID, subtaskID *int64,
	streamID int64,
	thinking, msg string,
) (int64, error) {
	return 0, nil
}

func (noopMsgLog) UpdateMsgResult(
	ctx context.Context,
	msgID, streamID int64,
	result string,
	resultFormat database.MsglogResultFormat,
) error {
	return nil
}

type noopAgentLog struct{}

func (noopAgentLog) PutLog(
	ctx context.Context,
	initiator, executor database.MsgchainType,
	task, result string,
	taskID, subtaskID *int64,
) (int64, error) {
	return 0, nil
}

// decodeFindings reads a stored findings blob, tolerating an empty or malformed one: the
// caller only needs the analyst overrides inside it, and a blob that cannot be parsed
// simply carries none.
func decodeFindings(blob []byte) []tools.Finding {
	var findings []tools.Finding
	if err := json.Unmarshal(blob, &findings); err != nil {
		return nil
	}

	return findings
}
