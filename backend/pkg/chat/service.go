// Package chat is the pentest chat: a plain conversation with the user's LLM
// provider. Nothing here creates a flow, starts a container or hands the
// model a tool, so a reply can only ever be text.
package chat

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math"
	"strings"
	"sync"
	"sync/atomic"
	"time"
	"unicode/utf8"

	"pentagi/pkg/config"
	"pentagi/pkg/database"
	"pentagi/pkg/providers/pconfig"
	"pentagi/pkg/providers/provider"

	"github.com/sirupsen/logrus"
	"github.com/vxcontrol/langchaingo/llms"
	"github.com/vxcontrol/langchaingo/llms/streaming"
)

const (
	replyTimeout    = 5 * time.Minute
	sideCallTimeout = time.Minute
	finishTimeout   = 10 * time.Second
	stopWaitTimeout = 5 * time.Second

	// publishInterval throttles streaming updates. Each update carries the
	// whole reply so far, so a client that misses some still converges.
	publishInterval = 100 * time.Millisecond

	maxRepliesPerUser = 2

	rateWindow   = time.Hour
	budgetWindow = 24 * time.Hour
)

var errRefused = errors.New("reply refused as out of scope")

// UserError carries a message that is safe to show the user as is. Any other
// error from the service is internal and must not reach the client verbatim.
type UserError struct {
	msg string
}

func (e *UserError) Error() string {
	return e.msg
}

func userErrorf(format string, args ...any) error {
	return &UserError{msg: fmt.Sprintf(format, args...)}
}

var ErrNotFound = &UserError{msg: "chat not found"}

type ProviderResolver interface {
	GetProvider(ctx context.Context, prvname provider.ProviderName) (provider.Provider, error)
}

// Publisher pushes chat changes to the owner's live subscriptions.
type Publisher interface {
	ChatSessionCreated(ctx context.Context, userID int64, session database.ChatSession)
	ChatSessionUpdated(ctx context.Context, userID int64, session database.ChatSession)
	ChatSessionDeleted(ctx context.Context, userID int64, session database.ChatSession)
	ChatMessageAdded(ctx context.Context, userID int64, message database.ChatMessage)
	ChatMessageUpdated(ctx context.Context, userID int64, message database.ChatMessage)
}

// Limits are per user. A zero MaxMessagesPerHour or DailyTokenBudget disables
// that limit.
type Limits struct {
	MaxMessagesPerHour int
	DailyTokenBudget   int
	MaxInputChars      int
	MaxOutputTokens    int
	ContextTokens      int
}

func LimitsFromConfig(cfg *config.Config) Limits {
	return Limits{
		MaxMessagesPerHour: max(cfg.ChatMaxMessagesPerHour, 0),
		DailyTokenBudget:   max(cfg.ChatDailyTokenBudget, 0),
		MaxInputChars:      max(cfg.ChatMaxInputChars, 1),
		MaxOutputTokens:    max(cfg.ChatMaxOutputTokens, 0),
		ContextTokens:      max(cfg.ChatContextTokens, 0),
	}
}

type Quota struct {
	MessagesUsed  int
	MessagesLimit int
	// MessagesResetAt is when the oldest counted message leaves the window.
	MessagesResetAt *time.Time
	TokensUsed      int64
	TokensLimit     int64
	TokensResetAt   *time.Time
	MaxInputChars   int
}

type SendResult struct {
	Session          database.ChatSession
	UserMessage      database.ChatMessage
	AssistantMessage database.ChatMessage
}

type Service struct {
	db        database.Querier
	providers ProviderResolver
	publisher Publisher
	limits    Limits
	logger    *logrus.Entry
	now       func() time.Time

	mx        sync.Mutex
	userLocks map[int64]*sync.Mutex
	// replies in progress, by assistant message id
	replies map[int64]*reply
	wg      sync.WaitGroup
}

type reply struct {
	userID    int64
	sessionID int64
	messageID int64
	usageID   int64
	cancel    context.CancelFunc
	stopped   atomic.Bool
	done      chan struct{}
}

func NewService(
	ctx context.Context,
	db database.Querier,
	providers ProviderResolver,
	publisher Publisher,
	limits Limits,
	logger *logrus.Entry,
) *Service {
	// Replies cannot outlive the process that streams them.
	if err := db.FailStreamingChatMessages(ctx); err != nil {
		logger.WithError(err).Warn("failed to close chat replies interrupted by a restart")
	}

	return &Service{
		db:        db,
		providers: providers,
		publisher: publisher,
		limits:    limits,
		logger:    logger,
		now:       time.Now,
		userLocks: make(map[int64]*sync.Mutex),
		replies:   make(map[int64]*reply),
	}
}

func (s *Service) ListSessions(ctx context.Context, userID int64) ([]database.ChatSession, error) {
	return s.db.GetUserChatSessions(ctx, userID)
}

func (s *Service) GetSession(ctx context.Context, userID, sessionID int64) (database.ChatSession, error) {
	session, err := s.db.GetUserChatSession(ctx, database.GetUserChatSessionParams{
		ID:     sessionID,
		UserID: userID,
	})
	if errors.Is(err, sql.ErrNoRows) {
		return database.ChatSession{}, ErrNotFound
	}

	return session, err
}

func (s *Service) ListMessages(ctx context.Context, userID, sessionID int64) ([]database.ChatMessage, error) {
	if _, err := s.GetSession(ctx, userID, sessionID); err != nil {
		return nil, err
	}

	return s.db.GetChatMessages(ctx, sessionID)
}

func (s *Service) RenameSession(ctx context.Context, userID, sessionID int64, title string) (database.ChatSession, error) {
	title = strings.Join(strings.Fields(title), " ")
	switch {
	case title == "":
		return database.ChatSession{}, userErrorf("title cannot be empty")
	case utf8.RuneCountInString(title) > maxSessionTitleRunes:
		return database.ChatSession{}, userErrorf("title must be at most %d characters", maxSessionTitleRunes)
	}

	session, err := s.db.UpdateUserChatSessionTitle(ctx, database.UpdateUserChatSessionTitleParams{
		ID:     sessionID,
		UserID: userID,
		Title:  title,
	})
	if errors.Is(err, sql.ErrNoRows) {
		return database.ChatSession{}, ErrNotFound
	} else if err != nil {
		return database.ChatSession{}, err
	}

	s.publisher.ChatSessionUpdated(ctx, userID, session)
	return session, nil
}

func (s *Service) DeleteSession(ctx context.Context, userID, sessionID int64) error {
	// A reply still streaming into the session is stopped first; its final
	// write then finds no row and is skipped, but its usage is still counted.
	s.mx.Lock()
	for _, r := range s.replies {
		if r.userID == userID && r.sessionID == sessionID {
			r.stopped.Store(true)
			r.cancel()
		}
	}
	s.mx.Unlock()

	session, err := s.db.DeleteUserChatSession(ctx, database.DeleteUserChatSessionParams{
		ID:     sessionID,
		UserID: userID,
	})
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	} else if err != nil {
		return err
	}

	s.publisher.ChatSessionDeleted(ctx, userID, session)
	return nil
}

func (s *Service) Quota(ctx context.Context, userID int64) (Quota, error) {
	now := s.now()
	quota := Quota{
		MessagesLimit: s.limits.MaxMessagesPerHour,
		TokensLimit:   int64(s.limits.DailyTokenBudget),
		MaxInputChars: s.limits.MaxInputChars,
	}

	replies, err := s.db.GetUserChatReplyStats(ctx, database.GetUserChatReplyStatsParams{
		UserID:    userID,
		CreatedAt: now.Add(-rateWindow),
	})
	if err != nil {
		return Quota{}, fmt.Errorf("failed to count chat messages: %w", err)
	}

	quota.MessagesUsed = int(replies.Count)
	if replies.Count > 0 {
		resetAt := replies.Oldest.Add(rateWindow)
		quota.MessagesResetAt = &resetAt
	}

	tokens, err := s.db.GetUserChatTokenStats(ctx, database.GetUserChatTokenStatsParams{
		UserID:    userID,
		CreatedAt: now.Add(-budgetWindow),
	})
	if err != nil {
		return Quota{}, fmt.Errorf("failed to sum chat tokens: %w", err)
	}

	quota.TokensUsed = tokens.Tokens
	if tokens.Tokens > 0 {
		resetAt := tokens.Oldest.Add(budgetWindow)
		quota.TokensResetAt = &resetAt
	}

	return quota, nil
}

// Send stores the question, starts the reply in the background and returns
// at once; the reply streams to the client through ChatMessageUpdated. A nil
// sessionID starts a new session.
func (s *Service) Send(
	ctx context.Context,
	userID int64,
	sessionID *int64,
	providerName, content string,
) (*SendResult, error) {
	content = normalizeInput(content)
	if content == "" {
		return nil, userErrorf("message cannot be empty")
	}
	if utf8.RuneCountInString(content) > s.limits.MaxInputChars {
		return nil, userErrorf("message is too long: the limit is %d characters", s.limits.MaxInputChars)
	}

	providerName = strings.TrimSpace(providerName)
	prv, err := s.resolveChatProvider(ctx, providerName)
	if err != nil {
		return nil, err
	}

	var session database.ChatSession
	if sessionID != nil {
		if session, err = s.GetSession(ctx, userID, *sessionID); err != nil {
			return nil, err
		}
	}

	// Admission and the ledger insert happen under one per-user lock so two
	// concurrent sends cannot both squeeze under a limit.
	lock := s.userLock(userID)
	lock.Lock()
	defer lock.Unlock()

	if err := s.admit(ctx, userID, session.ID); err != nil {
		return nil, err
	}

	isNewSession := sessionID == nil
	if isNewSession {
		session, err = s.db.CreateChatSession(ctx, database.CreateChatSessionParams{
			UserID:       userID,
			Title:        initialTitle(content),
			ProviderName: providerName,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to create chat session: %w", err)
		}
	}

	result, usageID, err := s.storeExchange(ctx, userID, session, prv, providerName, content)
	if err != nil {
		if isNewSession {
			_, _ = s.db.DeleteUserChatSession(ctx, database.DeleteUserChatSessionParams{ID: session.ID, UserID: userID})
		}
		return nil, err
	}

	replyCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), replyTimeout)
	r := &reply{
		userID:    userID,
		sessionID: session.ID,
		messageID: result.AssistantMessage.ID,
		usageID:   usageID,
		cancel:    cancel,
		done:      make(chan struct{}),
	}

	s.mx.Lock()
	s.replies[r.messageID] = r
	s.mx.Unlock()

	if isNewSession {
		s.publisher.ChatSessionCreated(ctx, userID, result.Session)
	} else {
		s.publisher.ChatSessionUpdated(ctx, userID, result.Session)
	}
	s.publisher.ChatMessageAdded(ctx, userID, result.UserMessage)
	s.publisher.ChatMessageAdded(ctx, userID, result.AssistantMessage)

	s.wg.Add(1)
	go func() {
		defer s.wg.Done()

		done := s.run(replyCtx, r, prv, result.Session, result.UserMessage, result.AssistantMessage)

		// After run has released the reply, so a follow-up is not blocked on
		// the title call. A stopped reply means the session may be gone.
		if isNewSession && done && !r.stopped.Load() {
			s.generateTitle(replyCtx, r, prv, result.Session, result.UserMessage.Content, s.replyLogger(r, providerName))
		}
	}()

	return result, nil
}

func (s *Service) storeExchange(
	ctx context.Context,
	userID int64,
	session database.ChatSession,
	prv provider.Provider,
	providerName, content string,
) (*SendResult, int64, error) {
	question, err := s.db.CreateChatMessage(ctx, database.CreateChatMessageParams{
		SessionID:    session.ID,
		Role:         database.ChatMessageRoleUser,
		Status:       database.ChatMessageStatusDone,
		Content:      content,
		ProviderName: providerName,
	})
	if err != nil {
		return nil, 0, fmt.Errorf("failed to store chat message: %w", err)
	}

	answer, err := s.db.CreateChatMessage(ctx, database.CreateChatMessageParams{
		SessionID:    session.ID,
		Role:         database.ChatMessageRoleAssistant,
		Status:       database.ChatMessageStatusStreaming,
		ProviderName: providerName,
		Model:        prv.Model(pconfig.OptionsTypeAssistant),
	})
	if err != nil {
		return nil, 0, fmt.Errorf("failed to store chat reply: %w", err)
	}

	// The ledger row starts with a worst-case reservation, replaced by the
	// real usage when the reply ends, so replies in flight already count
	// against the budget and a restart mid-reply cannot leave them free.
	usage, err := s.db.CreateChatUsage(ctx, database.CreateChatUsageParams{
		UserID:    userID,
		Kind:      database.ChatUsageKindReply,
		SessionID: sql.NullInt64{Int64: session.ID, Valid: true},
		MessageID: sql.NullInt64{Int64: answer.ID, Valid: true},
		UsageIn:   s.reservedInputTokens(content),
		UsageOut:  int64(s.maxOutputTokens(prv)),
	})
	if err != nil {
		return nil, 0, fmt.Errorf("failed to record chat usage: %w", err)
	}

	session, err = s.db.TouchChatSession(ctx, database.TouchChatSessionParams{
		ID:           session.ID,
		ProviderName: providerName,
	})
	if err != nil {
		return nil, 0, fmt.Errorf("failed to update chat session: %w", err)
	}

	return &SendResult{Session: session, UserMessage: question, AssistantMessage: answer}, usage.ID, nil
}

// Stop ends a reply that is still streaming and keeps what was written so far.
func (s *Service) Stop(ctx context.Context, userID, messageID int64) (database.ChatMessage, error) {
	msg, err := s.getMessage(ctx, userID, messageID)
	if err != nil || msg.Status != database.ChatMessageStatusStreaming {
		return msg, err
	}

	s.mx.Lock()
	r := s.replies[messageID]
	s.mx.Unlock()

	if r == nil {
		// Nothing is streaming it any more (e.g. another instance or a
		// crash); just close it.
		final, err := s.db.FinishChatMessage(ctx, database.FinishChatMessageParams{
			ID:      msg.ID,
			Status:  database.ChatMessageStatusStopped,
			Content: msg.Content,
			Model:   msg.Model,
		})
		if err == nil {
			s.publisher.ChatMessageUpdated(ctx, userID, final)
		}
		return s.getMessage(ctx, userID, messageID)
	}

	r.stopped.Store(true)
	r.cancel()

	select {
	case <-r.done:
	case <-time.After(stopWaitTimeout):
	case <-ctx.Done():
	}

	return s.getMessage(ctx, userID, messageID)
}

// Wait blocks until every reply in progress has finished.
func (s *Service) Wait() {
	s.wg.Wait()
}

func (s *Service) getMessage(ctx context.Context, userID, messageID int64) (database.ChatMessage, error) {
	msg, err := s.db.GetUserChatMessage(ctx, database.GetUserChatMessageParams{
		ID:     messageID,
		UserID: userID,
	})
	if errors.Is(err, sql.ErrNoRows) {
		return database.ChatMessage{}, ErrNotFound
	}

	return msg, err
}

// resolveChatProvider turns the provider name into the provider that answers
// chat messages, resolved like a flow's from the shared providers and then the
// system ones. Callers have already chosen the name: an admin's pick, or the
// shared default for everyone else.
func (s *Service) resolveChatProvider(ctx context.Context, name string) (provider.Provider, error) {
	if name == "" {
		return nil, userErrorf("select a provider")
	}

	prv, err := s.providers.GetProvider(ctx, provider.ProviderName(name))
	if err != nil {
		s.logger.WithError(err).WithField("provider", name).Debug("chat provider not available")
		return nil, userErrorf("provider '%s' is not available", name)
	}

	return prv, nil
}

func (s *Service) userLock(userID int64) *sync.Mutex {
	s.mx.Lock()
	defer s.mx.Unlock()

	lock, ok := s.userLocks[userID]
	if !ok {
		lock = &sync.Mutex{}
		s.userLocks[userID] = lock
	}

	return lock
}

func (s *Service) admit(ctx context.Context, userID, sessionID int64) error {
	inProgress, sessionBusy := 0, false

	s.mx.Lock()
	for _, r := range s.replies {
		if r.userID != userID {
			continue
		}
		inProgress++
		if sessionID != 0 && r.sessionID == sessionID {
			sessionBusy = true
		}
	}
	s.mx.Unlock()

	switch {
	case sessionBusy:
		return userErrorf("wait for the current reply to finish")
	case inProgress >= maxRepliesPerUser:
		return userErrorf("you already have %d replies in progress, wait for one to finish", inProgress)
	}

	quota, err := s.Quota(ctx, userID)
	if err != nil {
		return err
	}

	now := s.now()
	if quota.MessagesLimit > 0 && quota.MessagesUsed >= quota.MessagesLimit {
		return userErrorf("you have reached the limit of %d messages per hour, try again %s",
			quota.MessagesLimit, retryIn(now, quota.MessagesResetAt))
	}
	if quota.TokensLimit > 0 && quota.TokensUsed >= quota.TokensLimit {
		return userErrorf("you have used your chat token budget for the last 24 hours, try again %s",
			retryIn(now, quota.TokensResetAt))
	}

	return nil
}

func retryIn(now time.Time, at *time.Time) string {
	if at == nil {
		return "later"
	}

	wait := at.Sub(now)
	switch {
	case wait <= time.Minute:
		return "in a minute"
	case wait < time.Hour:
		return fmt.Sprintf("in %d minutes", int(math.Ceil(wait.Minutes())))
	default:
		return fmt.Sprintf("in about %d hours", int(math.Ceil(wait.Hours())))
	}
}

// run streams one reply and reports whether it completed normally.
func (s *Service) run(
	ctx context.Context,
	r *reply,
	prv provider.Provider,
	session database.ChatSession,
	question, answer database.ChatMessage,
) (completed bool) {
	defer close(r.done)
	defer func() {
		s.mx.Lock()
		delete(s.replies, r.messageID)
		s.mx.Unlock()
	}()
	defer r.cancel()

	logger := s.replyLogger(r, answer.ProviderName)

	defer func() {
		if rec := recover(); rec != nil {
			logger.WithField("panic", rec).Error("chat reply panicked")
			s.finish(ctx, r, answer, database.ChatMessageStatusError, "", logger)
			completed = false
		}
	}()

	chain := s.prepareChain(ctx, r, prv, session, question, logger)
	inputTokens := estimateTokens(chain)

	guard := &streamGuard{}
	var (
		lastPublish    time.Time
		reasoningBytes int
	)
	streamCb := func(ctx context.Context, chunk streaming.Chunk) error {
		if chunk.Type == streaming.ChunkTypeReasoning && chunk.Reasoning != nil {
			// never shown, but billed
			reasoningBytes += len(chunk.Reasoning.Content)
			return nil
		}
		if chunk.Type != streaming.ChunkTypeText || chunk.Content == "" {
			return nil
		}

		switch guard.Feed(chunk.Content) {
		case guardRefused:
			// stop paying for a reply nobody will see
			return errRefused
		case guardPassed:
			if now := s.now(); now.Sub(lastPublish) >= publishInterval {
				lastPublish = now
				partial := answer
				partial.Content = guard.Visible()
				partial.UpdatedAt = now
				s.publisher.ChatMessageUpdated(ctx, r.userID, partial)
			}
		}

		return nil
	}

	var extra []llms.CallOption
	if maxTokens := s.maxOutputTokens(prv); maxTokens > 0 {
		extra = append(extra, llms.WithMaxTokens(maxTokens))
	}

	resp, err := prv.CallWithExtraOptions(ctx, pconfig.OptionsTypeAssistant, chain, nil, streamCb, extra...)

	content := guard.raw.String()
	if resp != nil && len(resp.Choices) > 0 && resp.Choices[0].Content != "" {
		content = resp.Choices[0].Content
	}

	status := database.ChatMessageStatusDone
	switch {
	// checked first: a stopped or failed reply may still carry the marker
	case guard.State() == guardRefused || isRefusal(content):
		status, content = database.ChatMessageStatusRefused, refusalMessage
	case r.stopped.Load():
		status, content = database.ChatMessageStatusStopped, guard.Visible()
	case err != nil:
		logger.WithError(err).Warn("chat reply failed")
		status, content = database.ChatMessageStatusError, guard.Visible()
	default:
		content = strings.TrimSpace(content)
		if content == "" {
			logger.Warn("chat reply came back empty")
			status = database.ChatMessageStatusError
		}
	}

	generated := guard.raw.Len() + reasoningBytes
	s.account(ctx, r, prv, resp, inputTokens, generated, status, logger)
	s.finish(ctx, r, answer, status, content, logger)

	return status == database.ChatMessageStatusDone
}

func (s *Service) replyLogger(r *reply, providerName string) *logrus.Entry {
	return s.logger.WithFields(logrus.Fields{
		"user_id":    r.userID,
		"session_id": r.sessionID,
		"message_id": r.messageID,
		"provider":   providerName,
	})
}

// reservedInputTokens bounds what a reply can consume as input before its
// chain is built: the context budget, or the question plus system prompt
// when the budget is unlimited.
func (s *Service) reservedInputTokens(question string) int64 {
	if s.limits.ContextTokens > 0 {
		return int64(s.limits.ContextTokens)
	}

	return int64(estimateTextTokens(systemPrompt) + estimateTextTokens(question))
}

// prepareChain builds the model input: system prompt, rolling summary, recent
// turns and the question, folding older turns into the summary when the
// history outgrows the context budget.
func (s *Service) prepareChain(
	ctx context.Context,
	r *reply,
	prv provider.Provider,
	session database.ChatSession,
	question database.ChatMessage,
	logger *logrus.Entry,
) []llms.MessageContent {
	messages, err := s.db.GetChatMessagesAfter(ctx, database.GetChatMessagesAfterParams{
		SessionID: session.ID,
		ID:        session.SummaryThroughID,
	})
	if err != nil {
		logger.WithError(err).Warn("failed to load chat history, answering without it")
		messages = nil
	}

	summary := session.Summary
	turns := collectTurns(messages, question.ID)
	budget := s.limits.ContextTokens

	if fold, keep := splitForSummary(summary, turns, question.Content, budget); len(fold) > 0 {
		if folded, ok := s.summarize(ctx, r, prv, session, summary, fold, logger); ok {
			summary = folded
		}
		// When summarizing fails the folded turns are simply dropped.
		turns = keep
	}

	turns = trimToBudget(summary, turns, question.Content, budget)
	return buildChain(summary, turns, question.Content)
}

func (s *Service) summarize(
	ctx context.Context,
	r *reply,
	prv provider.Provider,
	session database.ChatSession,
	previous string,
	fold []turn,
	logger *logrus.Entry,
) (string, bool) {
	callCtx, cancel := context.WithTimeout(ctx, sideCallTimeout)
	defer cancel()

	prompt := buildSummaryPrompt(previous, fold)
	out, err := prv.Call(callCtx, pconfig.OptionsTypeSimple, prompt)
	out = strings.TrimSpace(out)
	if err != nil || out == "" {
		logger.WithError(err).Warn("failed to summarize chat history")
		return "", false
	}
	out = truncateRunes(out, maxSummaryRunes)

	s.recordSideUsage(ctx, r, prv, database.ChatUsageKindSummary, prompt, out, logger)

	_, err = s.db.UpdateChatSessionSummary(ctx, database.UpdateChatSessionSummaryParams{
		ID:               session.ID,
		Summary:          out,
		SummaryThroughID: fold[len(fold)-1].lastID,
	})
	if err != nil {
		logger.WithError(err).Warn("failed to store chat summary")
	}

	return out, true
}

func (s *Service) generateTitle(
	ctx context.Context,
	r *reply,
	prv provider.Provider,
	session database.ChatSession,
	question string,
	logger *logrus.Entry,
) {
	callCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), sideCallTimeout)
	defer cancel()

	prompt := buildTitlePrompt(question)
	out, err := prv.Call(callCtx, pconfig.OptionsTypeSimple, prompt)
	if err != nil {
		logger.WithError(err).Debug("failed to generate chat title")
		return
	}

	s.recordSideUsage(callCtx, r, prv, database.ChatUsageKindTitle, prompt, out, logger)

	title := cleanTitle(out)
	if title == "" {
		return
	}

	// Only replaces the placeholder: a rename in the meantime wins.
	updated, err := s.db.ReplaceChatSessionTitle(callCtx, database.ReplaceChatSessionTitleParams{
		ID:      session.ID,
		Title:   session.Title,
		Title_2: title,
	})
	if err != nil {
		return
	}

	s.publisher.ChatSessionUpdated(callCtx, r.userID, updated)
}

// account records what the reply cost. Providers that report no usage get an
// estimate, so the budget cannot be dodged with such a provider. A reply that
// failed before anything was generated is not counted at all.
func (s *Service) account(
	ctx context.Context,
	r *reply,
	prv provider.Provider,
	resp *llms.ContentResponse,
	inputTokens int,
	generatedBytes int,
	status database.ChatMessageStatus,
	logger *logrus.Entry,
) {
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), finishTimeout)
	defer cancel()

	var usage pconfig.CallUsage
	if resp != nil {
		for _, choice := range resp.Choices {
			usage.Merge(prv.GetUsage(choice.GenerationInfo))
		}
	}

	if usage.IsZero() {
		if status == database.ChatMessageStatusError && generatedBytes == 0 {
			if err := s.db.DeleteChatUsage(ctx, r.usageID); err != nil {
				logger.WithError(err).Warn("failed to release chat usage")
			}
			return
		}
		usage.Input = int64(inputTokens)
		usage.Output = int64(generatedBytes / bytesPerToken)
	}

	usage.UpdateCost(prv.GetPriceInfo(pconfig.OptionsTypeAssistant))

	err := s.db.UpdateChatUsage(ctx, database.UpdateChatUsageParams{
		ID:       r.usageID,
		UsageIn:  usage.Input,
		UsageOut: usage.Output,
		CostIn:   usage.CostInput,
		CostOut:  usage.CostOutput,
	})
	if err != nil {
		logger.WithError(err).Error("failed to record chat usage")
	}
}

func (s *Service) recordSideUsage(
	ctx context.Context,
	r *reply,
	prv provider.Provider,
	kind database.ChatUsageKind,
	prompt, out string,
	logger *logrus.Entry,
) {
	// Call returns no usage, so side calls are always estimated.
	usage := pconfig.CallUsage{
		Input:  int64(estimateTextTokens(prompt)),
		Output: int64(estimateTextTokens(out)),
	}
	usage.UpdateCost(prv.GetPriceInfo(pconfig.OptionsTypeSimple))

	params := database.CreateChatUsageParams{
		UserID:    r.userID,
		Kind:      kind,
		SessionID: sql.NullInt64{Int64: r.sessionID, Valid: true},
		UsageIn:   usage.Input,
		UsageOut:  usage.Output,
		CostIn:    usage.CostInput,
		CostOut:   usage.CostOutput,
	}

	ctx = context.WithoutCancel(ctx)
	if _, err := s.db.CreateChatUsage(ctx, params); err != nil {
		// The session may have been deleted during the call; the tokens
		// still count.
		params.SessionID = sql.NullInt64{}
		if _, err := s.db.CreateChatUsage(ctx, params); err != nil {
			logger.WithError(err).Warn("failed to record chat usage")
		}
	}
}

func (s *Service) finish(
	ctx context.Context,
	r *reply,
	answer database.ChatMessage,
	status database.ChatMessageStatus,
	content string,
	logger *logrus.Entry,
) {
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), finishTimeout)
	defer cancel()

	final, err := s.db.FinishChatMessage(ctx, database.FinishChatMessageParams{
		ID:      answer.ID,
		Status:  status,
		Content: content,
		Model:   answer.Model,
	})
	if errors.Is(err, sql.ErrNoRows) {
		// the session was deleted meanwhile
		return
	} else if err != nil {
		logger.WithError(err).Error("failed to store chat reply")
		return
	}

	s.publisher.ChatMessageUpdated(ctx, r.userID, final)
}

// maxOutputTokens is the lower of the provider's own assistant max_tokens and
// the configured chat cap, so the chat never asks for more than either allows.
// Zero means no explicit cap.
func (s *Service) maxOutputTokens(prv provider.Provider) int {
	var opts llms.CallOptions
	for _, opt := range prv.GetProviderConfig().GetOptionsForType(pconfig.OptionsTypeAssistant) {
		opt(&opts)
	}

	limit := s.limits.MaxOutputTokens
	if opts.MaxTokens != nil && *opts.MaxTokens > 0 && (limit <= 0 || *opts.MaxTokens < limit) {
		return *opts.MaxTokens
	}

	return limit
}
