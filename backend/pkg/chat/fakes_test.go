package chat

import (
	"context"
	"database/sql"
	"errors"
	"slices"
	"strings"
	"sync"
	"time"

	"pentagi/pkg/database"
	"pentagi/pkg/providers/pconfig"
	"pentagi/pkg/providers/provider"

	"github.com/vxcontrol/langchaingo/llms"
	"github.com/vxcontrol/langchaingo/llms/reasoning"
	"github.com/vxcontrol/langchaingo/llms/streaming"
)

// fakeDB is an in-memory database.Querier covering the chat queries. Any
// other query panics through the nil embedded interface.
type fakeDB struct {
	database.Querier

	mx       sync.Mutex
	now      func() time.Time
	nextID   int64
	sessions map[int64]database.ChatSession
	messages map[int64]database.ChatMessage
	usage    map[int64]database.ChatUsage
}

func newFakeDB(now func() time.Time) *fakeDB {
	return &fakeDB{
		now:      now,
		sessions: map[int64]database.ChatSession{},
		messages: map[int64]database.ChatMessage{},
		usage:    map[int64]database.ChatUsage{},
	}
}

func (f *fakeDB) id() int64 {
	f.nextID++
	return f.nextID
}

func (f *fakeDB) FailStreamingChatMessages(ctx context.Context) error {
	f.mx.Lock()
	defer f.mx.Unlock()
	for id, m := range f.messages {
		if m.Status == database.ChatMessageStatusStreaming {
			m.Status = database.ChatMessageStatusError
			f.messages[id] = m
		}
	}
	return nil
}

func (f *fakeDB) CreateChatSession(ctx context.Context, arg database.CreateChatSessionParams) (database.ChatSession, error) {
	f.mx.Lock()
	defer f.mx.Unlock()
	s := database.ChatSession{
		ID: f.id(), UserID: arg.UserID, Title: arg.Title, ProviderName: arg.ProviderName,
		CreatedAt: f.now(), UpdatedAt: f.now(),
	}
	f.sessions[s.ID] = s
	return s, nil
}

func (f *fakeDB) GetUserChatSessions(ctx context.Context, userID int64) ([]database.ChatSession, error) {
	f.mx.Lock()
	defer f.mx.Unlock()
	var out []database.ChatSession
	for _, s := range f.sessions {
		if s.UserID == userID {
			out = append(out, s)
		}
	}
	return out, nil
}

func (f *fakeDB) GetUserChatSession(ctx context.Context, arg database.GetUserChatSessionParams) (database.ChatSession, error) {
	f.mx.Lock()
	defer f.mx.Unlock()
	s, ok := f.sessions[arg.ID]
	if !ok || s.UserID != arg.UserID {
		return database.ChatSession{}, sql.ErrNoRows
	}
	return s, nil
}

func (f *fakeDB) UpdateUserChatSessionTitle(ctx context.Context, arg database.UpdateUserChatSessionTitleParams) (database.ChatSession, error) {
	f.mx.Lock()
	defer f.mx.Unlock()
	s, ok := f.sessions[arg.ID]
	if !ok || s.UserID != arg.UserID {
		return database.ChatSession{}, sql.ErrNoRows
	}
	s.Title = arg.Title
	f.sessions[s.ID] = s
	return s, nil
}

func (f *fakeDB) ReplaceChatSessionTitle(ctx context.Context, arg database.ReplaceChatSessionTitleParams) (database.ChatSession, error) {
	f.mx.Lock()
	defer f.mx.Unlock()
	s, ok := f.sessions[arg.ID]
	if !ok || s.Title != arg.Title {
		return database.ChatSession{}, sql.ErrNoRows
	}
	s.Title = arg.Title_2
	f.sessions[s.ID] = s
	return s, nil
}

func (f *fakeDB) TouchChatSession(ctx context.Context, arg database.TouchChatSessionParams) (database.ChatSession, error) {
	f.mx.Lock()
	defer f.mx.Unlock()
	s, ok := f.sessions[arg.ID]
	if !ok {
		return database.ChatSession{}, sql.ErrNoRows
	}
	s.ProviderName = arg.ProviderName
	s.UpdatedAt = f.now()
	f.sessions[s.ID] = s
	return s, nil
}

func (f *fakeDB) UpdateChatSessionSummary(ctx context.Context, arg database.UpdateChatSessionSummaryParams) (database.ChatSession, error) {
	f.mx.Lock()
	defer f.mx.Unlock()
	s, ok := f.sessions[arg.ID]
	if !ok {
		return database.ChatSession{}, sql.ErrNoRows
	}
	s.Summary = arg.Summary
	s.SummaryThroughID = arg.SummaryThroughID
	f.sessions[s.ID] = s
	return s, nil
}

func (f *fakeDB) DeleteUserChatSession(ctx context.Context, arg database.DeleteUserChatSessionParams) (database.ChatSession, error) {
	f.mx.Lock()
	defer f.mx.Unlock()
	s, ok := f.sessions[arg.ID]
	if !ok || s.UserID != arg.UserID {
		return database.ChatSession{}, sql.ErrNoRows
	}
	delete(f.sessions, s.ID)
	for id, m := range f.messages {
		if m.SessionID == s.ID {
			delete(f.messages, id)
		}
	}
	// ON DELETE SET NULL, like the real schema
	for id, u := range f.usage {
		if u.SessionID.Valid && u.SessionID.Int64 == s.ID {
			u.SessionID = sql.NullInt64{}
			u.MessageID = sql.NullInt64{}
			f.usage[id] = u
		}
	}
	return s, nil
}

func (f *fakeDB) CreateChatMessage(ctx context.Context, arg database.CreateChatMessageParams) (database.ChatMessage, error) {
	f.mx.Lock()
	defer f.mx.Unlock()
	m := database.ChatMessage{
		ID: f.id(), SessionID: arg.SessionID, Role: arg.Role, Status: arg.Status, Content: arg.Content,
		ProviderName: arg.ProviderName, Model: arg.Model, CreatedAt: f.now(), UpdatedAt: f.now(),
	}
	f.messages[m.ID] = m
	return m, nil
}

func (f *fakeDB) sortedMessages(sessionID, after int64) []database.ChatMessage {
	var out []database.ChatMessage
	for _, m := range f.messages {
		if m.SessionID == sessionID && m.ID > after {
			out = append(out, m)
		}
	}
	slices.SortFunc(out, func(a, b database.ChatMessage) int { return int(a.ID - b.ID) })
	return out
}

func (f *fakeDB) GetChatMessages(ctx context.Context, sessionID int64) ([]database.ChatMessage, error) {
	f.mx.Lock()
	defer f.mx.Unlock()
	return f.sortedMessages(sessionID, 0), nil
}

func (f *fakeDB) GetChatMessagesAfter(ctx context.Context, arg database.GetChatMessagesAfterParams) ([]database.ChatMessage, error) {
	f.mx.Lock()
	defer f.mx.Unlock()
	return f.sortedMessages(arg.SessionID, arg.ID), nil
}

func (f *fakeDB) GetUserChatMessage(ctx context.Context, arg database.GetUserChatMessageParams) (database.ChatMessage, error) {
	f.mx.Lock()
	defer f.mx.Unlock()
	m, ok := f.messages[arg.ID]
	if !ok {
		return database.ChatMessage{}, sql.ErrNoRows
	}
	if s, ok := f.sessions[m.SessionID]; !ok || s.UserID != arg.UserID {
		return database.ChatMessage{}, sql.ErrNoRows
	}
	return m, nil
}

func (f *fakeDB) FinishChatMessage(ctx context.Context, arg database.FinishChatMessageParams) (database.ChatMessage, error) {
	f.mx.Lock()
	defer f.mx.Unlock()
	m, ok := f.messages[arg.ID]
	if !ok || m.Status != database.ChatMessageStatusStreaming {
		return database.ChatMessage{}, sql.ErrNoRows
	}
	m.Status, m.Content, m.Model, m.UpdatedAt = arg.Status, arg.Content, arg.Model, f.now()
	f.messages[m.ID] = m
	return m, nil
}

func (f *fakeDB) CreateChatUsage(ctx context.Context, arg database.CreateChatUsageParams) (database.ChatUsage, error) {
	f.mx.Lock()
	defer f.mx.Unlock()
	// foreign key, like the real schema
	if _, ok := f.sessions[arg.SessionID.Int64]; arg.SessionID.Valid && !ok {
		return database.ChatUsage{}, errors.New("violates foreign key constraint chat_usage_session_id_fkey")
	}
	u := database.ChatUsage{
		ID: f.id(), UserID: arg.UserID, Kind: arg.Kind, SessionID: arg.SessionID, MessageID: arg.MessageID,
		UsageIn: arg.UsageIn, UsageOut: arg.UsageOut, CostIn: arg.CostIn, CostOut: arg.CostOut, CreatedAt: f.now(),
	}
	f.usage[u.ID] = u
	return u, nil
}

func (f *fakeDB) UpdateChatUsage(ctx context.Context, arg database.UpdateChatUsageParams) error {
	f.mx.Lock()
	defer f.mx.Unlock()
	u, ok := f.usage[arg.ID]
	if !ok {
		return nil
	}
	u.UsageIn, u.UsageOut, u.CostIn, u.CostOut = arg.UsageIn, arg.UsageOut, arg.CostIn, arg.CostOut
	f.usage[u.ID] = u
	return nil
}

func (f *fakeDB) DeleteChatUsage(ctx context.Context, id int64) error {
	f.mx.Lock()
	defer f.mx.Unlock()
	delete(f.usage, id)
	return nil
}

func (f *fakeDB) GetUserChatReplyStats(ctx context.Context, arg database.GetUserChatReplyStatsParams) (database.GetUserChatReplyStatsRow, error) {
	f.mx.Lock()
	defer f.mx.Unlock()
	row := database.GetUserChatReplyStatsRow{Oldest: f.now()}
	for _, u := range f.usage {
		if u.UserID == arg.UserID && u.Kind == database.ChatUsageKindReply && u.CreatedAt.After(arg.CreatedAt) {
			row.Count++
			if u.CreatedAt.Before(row.Oldest) {
				row.Oldest = u.CreatedAt
			}
		}
	}
	return row, nil
}

func (f *fakeDB) GetUserChatTokenStats(ctx context.Context, arg database.GetUserChatTokenStatsParams) (database.GetUserChatTokenStatsRow, error) {
	f.mx.Lock()
	defer f.mx.Unlock()
	row := database.GetUserChatTokenStatsRow{Oldest: f.now()}
	for _, u := range f.usage {
		if u.UserID == arg.UserID && u.CreatedAt.After(arg.CreatedAt) {
			row.Tokens += u.UsageIn + u.UsageOut
			if u.CreatedAt.Before(row.Oldest) {
				row.Oldest = u.CreatedAt
			}
		}
	}
	return row, nil
}

func (f *fakeDB) message(id int64) database.ChatMessage {
	f.mx.Lock()
	defer f.mx.Unlock()
	return f.messages[id]
}

func (f *fakeDB) session(id int64) database.ChatSession {
	f.mx.Lock()
	defer f.mx.Unlock()
	return f.sessions[id]
}

func (f *fakeDB) usageRows(kind database.ChatUsageKind) []database.ChatUsage {
	f.mx.Lock()
	defer f.mx.Unlock()
	var out []database.ChatUsage
	for _, u := range f.usage {
		if u.Kind == kind {
			out = append(out, u)
		}
	}
	return out
}

// fakeProvider streams scripted replies. A provider.Provider method the chat
// should never call panics through the nil embedded interface.
type fakeProvider struct {
	provider.Provider

	mx sync.Mutex
	// reasoning chunks streamed before the text ones
	reasoning []string
	// chunks to stream for the main reply
	chunks []string
	// final content in the response; defaults to the joined chunks
	final *string
	err   error
	usage pconfig.CallUsage
	// block, when set, makes the reply wait after streaming its chunks until
	// the context is cancelled or the channel is closed.
	block chan struct{}
	// simple answers Call(simple) prompts: titles and summaries
	simple func(prompt string) (string, error)

	cfg *pconfig.ProviderConfig

	calls       int
	lastChain   []llms.MessageContent
	lastTools   []llms.Tool
	lastOptions llms.CallOptions
	simpleCalls []string
	started     chan struct{}
}

func newFakeProvider(chunks ...string) *fakeProvider {
	return &fakeProvider{chunks: chunks, started: make(chan struct{}, 16)}
}

func (p *fakeProvider) Model(opt pconfig.ProviderOptionsType) string {
	return "fake-model"
}

func (p *fakeProvider) GetUsage(info map[string]any) pconfig.CallUsage {
	return pconfig.NewCallUsage(info)
}

func (p *fakeProvider) GetPriceInfo(opt pconfig.ProviderOptionsType) *pconfig.PriceInfo {
	return nil
}

func (p *fakeProvider) GetProviderConfig() *pconfig.ProviderConfig {
	return p.cfg
}

func (p *fakeProvider) Call(ctx context.Context, opt pconfig.ProviderOptionsType, prompt string) (string, error) {
	p.mx.Lock()
	p.simpleCalls = append(p.simpleCalls, prompt)
	simple := p.simple
	p.mx.Unlock()

	if simple == nil {
		return "Generated Title", nil
	}
	return simple(prompt)
}

func (p *fakeProvider) CallWithExtraOptions(
	ctx context.Context,
	opt pconfig.ProviderOptionsType,
	chain []llms.MessageContent,
	tools []llms.Tool,
	streamCb streaming.Callback,
	extra ...llms.CallOption,
) (*llms.ContentResponse, error) {
	p.mx.Lock()
	p.calls++
	p.lastChain = chain
	p.lastTools = tools
	p.lastOptions = llms.CallOptions{}
	for _, o := range extra {
		o(&p.lastOptions)
	}
	chunks, final, err, usage, block := p.chunks, p.final, p.err, p.usage, p.block
	reasoningChunks := p.reasoning
	p.mx.Unlock()

	p.started <- struct{}{}

	for _, r := range reasoningChunks {
		chunk := streaming.Chunk{Type: streaming.ChunkTypeReasoning, Reasoning: &reasoning.ContentReasoning{Content: r}}
		if err := streamCb(ctx, chunk); err != nil {
			return nil, err
		}
	}

	for _, c := range chunks {
		if err := streamCb(ctx, streaming.NewTextChunk(c)); err != nil {
			return nil, err
		}
	}

	if block != nil {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-block:
		}
	}

	if err != nil {
		return nil, err
	}

	content := strings.Join(chunks, "")
	if final != nil {
		content = *final
	}

	info := map[string]any{}
	if !usage.IsZero() {
		info["PromptTokens"] = int(usage.Input)
		info["CompletionTokens"] = int(usage.Output)
	}

	return &llms.ContentResponse{Choices: []*llms.ContentChoice{{Content: content, GenerationInfo: info}}}, nil
}

type fakeResolver struct {
	providers map[string]provider.Provider
	// owner restricts a provider name to one user, like a user-defined provider
	owner map[string]int64
}

func (r *fakeResolver) GetProvider(ctx context.Context, name provider.ProviderName, userID int64) (provider.Provider, error) {
	if owner, ok := r.owner[string(name)]; ok && owner != userID {
		return nil, sql.ErrNoRows
	}
	prv, ok := r.providers[string(name)]
	if !ok {
		return nil, sql.ErrNoRows
	}
	return prv, nil
}

type publishedEvent struct {
	kind    string
	userID  int64
	session database.ChatSession
	message database.ChatMessage
}

type fakePublisher struct {
	mx     sync.Mutex
	events []publishedEvent
}

func (p *fakePublisher) add(e publishedEvent) {
	p.mx.Lock()
	defer p.mx.Unlock()
	p.events = append(p.events, e)
}

func (p *fakePublisher) ChatSessionCreated(ctx context.Context, userID int64, s database.ChatSession) {
	p.add(publishedEvent{kind: "session.created", userID: userID, session: s})
}

func (p *fakePublisher) ChatSessionUpdated(ctx context.Context, userID int64, s database.ChatSession) {
	p.add(publishedEvent{kind: "session.updated", userID: userID, session: s})
}

func (p *fakePublisher) ChatSessionDeleted(ctx context.Context, userID int64, s database.ChatSession) {
	p.add(publishedEvent{kind: "session.deleted", userID: userID, session: s})
}

func (p *fakePublisher) ChatMessageAdded(ctx context.Context, userID int64, m database.ChatMessage) {
	p.add(publishedEvent{kind: "message.added", userID: userID, message: m})
}

func (p *fakePublisher) ChatMessageUpdated(ctx context.Context, userID int64, m database.ChatMessage) {
	p.add(publishedEvent{kind: "message.updated", userID: userID, message: m})
}

func (p *fakePublisher) snapshot() []publishedEvent {
	p.mx.Lock()
	defer p.mx.Unlock()
	return slices.Clone(p.events)
}
