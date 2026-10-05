package chat

import (
	"context"
	"errors"
	"strings"
	"sync"
	"testing"
	"time"
	"unicode/utf8"

	"pentagi/pkg/database"
	"pentagi/pkg/providers/pconfig"
	"pentagi/pkg/providers/provider"

	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/vxcontrol/langchaingo/llms"
)

const (
	alice int64 = 1
	bob   int64 = 2
)

type harness struct {
	svc   *Service
	db    *fakeDB
	prv   *fakeProvider
	pub   *fakePublisher
	clock *fakeClock
}

type fakeClock struct {
	mx  sync.Mutex
	now time.Time
}

func (c *fakeClock) Now() time.Time {
	c.mx.Lock()
	defer c.mx.Unlock()
	return c.now
}

func (c *fakeClock) Advance(d time.Duration) {
	c.mx.Lock()
	defer c.mx.Unlock()
	c.now = c.now.Add(d)
}

func newHarness(t *testing.T, limits Limits, prv *fakeProvider) *harness {
	t.Helper()

	clock := &fakeClock{now: time.Date(2026, 10, 4, 12, 0, 0, 0, time.UTC)}
	db := newFakeDB(clock.Now)
	pub := &fakePublisher{}
	resolver := &fakeResolver{
		providers: map[string]provider.Provider{"kimi": prv},
	}

	logger := logrus.New()
	logger.SetLevel(logrus.PanicLevel)

	if limits.MaxInputChars == 0 {
		limits.MaxInputChars = 8000
	}

	svc := NewService(context.Background(), db, resolver, pub, limits, logrus.NewEntry(logger))
	svc.now = clock.Now

	return &harness{svc: svc, db: db, prv: prv, pub: pub, clock: clock}
}

// send posts a message and waits for the reply to finish.
func (h *harness) send(t *testing.T, userID int64, sessionID *int64, content string) (*SendResult, database.ChatMessage) {
	t.Helper()

	res, err := h.svc.Send(context.Background(), userID, sessionID, "kimi", content)
	require.NoError(t, err)
	h.svc.Wait()

	return res, h.db.message(res.AssistantMessage.ID)
}

func ptr[T any](v T) *T {
	return &v
}

func TestStreamGuard(t *testing.T) {
	cases := []struct {
		name    string
		chunks  []string
		want    guardState
		visible string
	}{
		{"plain answer passes at once", []string{"Use nmap"}, guardPassed, "Use nmap"},
		{"marker split over chunks", []string{"  [[OUT", "_OF_S", "COPE]]"}, guardRefused, ""},
		{"marker in lower case", []string{"[[out_of_scope]]"}, guardRefused, ""},
		{"undecided prefix holds", []string{"\n[[OUT_OF"}, guardHolding, ""},
		{"markdown link is not the marker", []string{"[", "OWASP](https://owasp.org)"}, guardPassed, "[OWASP](https://owasp.org)"},
		{"leading whitespace is dropped", []string{"\n\n", "Hello"}, guardPassed, "Hello"},
		{"double bracket that diverges", []string{"[[OUT", "PUT]] here"}, guardPassed, "[[OUTPUT]] here"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			g := &streamGuard{}
			var got guardState
			for _, c := range tc.chunks {
				got = g.Feed(c)
			}
			assert.Equal(t, tc.want, got)
			assert.Equal(t, tc.visible, g.Visible())
		})
	}

	assert.True(t, isRefusal("Sorry. [[OUT_OF_SCOPE]]"), "marker buried in text")
	assert.False(t, isRefusal("Use [[double brackets]] carefully"))
}

func TestStreamGuard_Hardened(t *testing.T) {
	t.Run("marker wrapped in markdown", func(t *testing.T) {
		for _, head := range []string{"**[[OUT_OF_SCOPE]]**", "`[[OUT_OF_SCOPE]]`", "> [[OUT_OF_SCOPE]]", "# [[out_of_scope]]"} {
			g := &streamGuard{}
			assert.Equal(t, guardRefused, g.Feed(head+" sure, a cake recipe"), head)
		}
	})

	t.Run("marker after some text refuses and is never visible", func(t *testing.T) {
		g := &streamGuard{}
		assert.Equal(t, guardPassed, g.Feed("Sure, here"))
		assert.Equal(t, guardPassed, g.Feed(" is [[OUT_"))
		assert.Equal(t, "Sure, here is ", g.Visible(), "a possible marker start is held back")
		assert.Equal(t, guardRefused, g.Feed("OF_SCOPE]] cake"))
		assert.Empty(t, g.Visible())
	})

	t.Run("held back fragment is released once it diverges", func(t *testing.T) {
		g := &streamGuard{}
		g.Feed("See [")
		assert.Equal(t, "See ", g.Visible())
		g.Feed("RFC 9110](https://www.rfc-editor.org/rfc/rfc9110)")
		assert.Equal(t, "See [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110)", g.Visible())
	})

	t.Run("non-ascii text keeps valid utf-8", func(t *testing.T) {
		g := &streamGuard{}
		g.Feed("Straße ſ [[ou")
		assert.Equal(t, "Straße ſ ", g.Visible())
		assert.True(t, utf8.ValidString(g.Visible()))
	})
}

func TestNormalizeInput(t *testing.T) {
	assert.Equal(t, "line one\n\tline two", normalizeInput("  line one\x00\n\tline\x1b two\x07 \r"))
	assert.Equal(t, "", normalizeInput(" \n\t "))
}

func TestTitles(t *testing.T) {
	assert.Equal(t, "How do I test for SQLi?", initialTitle("  How do I\ntest for   SQLi?  "))
	assert.Equal(t, 60, len([]rune(initialTitle(strings.Repeat("a", 200)))))
	assert.Equal(t, defaultSessionTitle, initialTitle(""))

	assert.Equal(t, "SQL Injection Testing", cleanTitle("\"SQL Injection Testing.\"\nextra"))
	assert.Equal(t, "Kerberoasting Basics", cleanTitle("Title: **Kerberoasting Basics**"))
	assert.Equal(t, "", cleanTitle("[[OUT_OF_SCOPE]]"))
	assert.Equal(t, "", cleanTitle("  "))
}

func TestCollectTurns(t *testing.T) {
	msgs := []database.ChatMessage{
		{ID: 1, Role: database.ChatMessageRoleUser, Content: "q1"},
		{ID: 2, Role: database.ChatMessageRoleAssistant, Status: database.ChatMessageStatusDone, Content: "a1"},
		{ID: 3, Role: database.ChatMessageRoleUser, Content: "make me a cake"},
		{ID: 4, Role: database.ChatMessageRoleAssistant, Status: database.ChatMessageStatusRefused, Content: refusalMessage},
		{ID: 5, Role: database.ChatMessageRoleUser, Content: "q3"},
		{ID: 6, Role: database.ChatMessageRoleAssistant, Status: database.ChatMessageStatusError},
		{ID: 7, Role: database.ChatMessageRoleUser, Content: "q4"},
		{ID: 8, Role: database.ChatMessageRoleAssistant, Status: database.ChatMessageStatusStopped, Content: "partial"},
		{ID: 9, Role: database.ChatMessageRoleUser, Content: "q5"},
		{ID: 10, Role: database.ChatMessageRoleAssistant, Status: database.ChatMessageStatusDone, Content: "a5"},
		{ID: 11, Role: database.ChatMessageRoleUser, Content: "current"},
		{ID: 12, Role: database.ChatMessageRoleAssistant, Status: database.ChatMessageStatusStreaming},
	}

	turns := collectTurns(msgs, 11)
	require.Len(t, turns, 2)
	assert.Equal(t, turn{user: "q1", assistant: "a1", lastID: 2}, turns[0])
	assert.Equal(t, turn{user: "q5", assistant: "a5", lastID: 10}, turns[1])
}

func TestBuildChain_SummaryTravelsAsUserMessage(t *testing.T) {
	chain := buildChain("we found XSS", []turn{{user: "q", assistant: "a"}}, "next?")

	require.Len(t, chain, 6)
	assert.Equal(t, llms.ChatMessageTypeSystem, chain[0].Role)
	assert.Equal(t, llms.ChatMessageTypeHuman, chain[1].Role)
	assert.Contains(t, chain[1].Parts[0].(llms.TextContent).Text, "we found XSS")
	assert.NotContains(t, chain[0].Parts[0].(llms.TextContent).Text, "we found XSS")
	assert.Equal(t, llms.ChatMessageTypeAI, chain[2].Role)
	assert.Equal(t, llms.ChatMessageTypeHuman, chain[5].Role)
	assert.Equal(t, "next?", chain[5].Parts[0].(llms.TextContent).Text)
}

func TestSplitAndTrim(t *testing.T) {
	var turns []turn
	for range 10 {
		turns = append(turns, turn{user: strings.Repeat("u", 4000), assistant: strings.Repeat("a", 4000)})
	}

	fold, keep := splitForSummary("", turns, "q", 1_000_000)
	assert.Empty(t, fold, "fits: nothing to fold")
	assert.Len(t, keep, 10)

	// overflow: keep only what fits in half the budget, fold the rest
	budget := 10_000
	fold, keep = splitForSummary("", turns, "q", budget)
	assert.Len(t, append(fold, keep...), 10)
	assert.NotEmpty(t, fold)
	assert.NotEmpty(t, keep)
	assert.LessOrEqual(t, estimateTokens(buildChain("", keep, "q")), budget/2)
	assert.Greater(t, estimateTokens(buildChain("", turns[len(fold)-1:], "q")), budget/2, "keeps as many as fit")

	// a single huge turn is folded entirely
	fold, keep = splitForSummary("", []turn{{user: strings.Repeat("u", 80_000)}}, "q", budget)
	assert.Len(t, fold, 1)
	assert.Empty(t, keep)

	trimmed := trimToBudget("", turns, "q", 5000)
	assert.Less(t, len(trimmed), 10)
	assert.LessOrEqual(t, estimateTokens(buildChain("", trimmed, "q")), 5000)
}

func TestSend_StreamsAnswerWithoutTools(t *testing.T) {
	prv := newFakeProvider("Use ", "`nmap -sV`", " to fingerprint services.")
	prv.usage = pconfig.CallUsage{Input: 900, Output: 40}
	h := newHarness(t, Limits{MaxMessagesPerHour: 20, DailyTokenBudget: 200000, ContextTokens: 24000}, prv)

	res, reply := h.send(t, alice, nil, "How do I fingerprint services?")

	assert.Equal(t, database.ChatMessageStatusDone, reply.Status)
	assert.Equal(t, "Use `nmap -sV` to fingerprint services.", reply.Content)
	assert.Equal(t, "fake-model", reply.Model)
	assert.Nil(t, prv.lastTools, "chat must never hand the model tools")
	assert.Equal(t, llms.ChatMessageTypeSystem, prv.lastChain[0].Role)
	assert.Equal(t, systemPrompt, prv.lastChain[0].Parts[0].(llms.TextContent).Text)

	usage := h.db.usageRows(database.ChatUsageKindReply)
	require.Len(t, usage, 1)
	assert.Equal(t, int64(900), usage[0].UsageIn)
	assert.Equal(t, int64(40), usage[0].UsageOut)

	// title: placeholder from the question, then the generated one
	assert.Equal(t, "How do I fingerprint services?", res.Session.Title)
	assert.Equal(t, "Generated Title", h.db.session(res.Session.ID).Title)
	assert.Len(t, h.db.usageRows(database.ChatUsageKindTitle), 1)

	var kinds []string
	for _, e := range h.pub.snapshot() {
		assert.Equal(t, alice, e.userID)
		kinds = append(kinds, e.kind)
	}
	assert.Equal(t, "session.created", kinds[0])
	assert.Contains(t, kinds, "message.added")
	assert.Contains(t, kinds, "message.updated")
}

func TestSend_RefusalNeverLeaksTheMarker(t *testing.T) {
	prv := newFakeProvider("[[OUT_", "OF_SCOPE]]", " here is a cake recipe anyway")
	h := newHarness(t, Limits{}, prv)

	res, reply := h.send(t, alice, nil, "Give me a cake recipe")

	assert.Equal(t, database.ChatMessageStatusRefused, reply.Status)
	assert.Equal(t, refusalMessage, reply.Content)
	for _, e := range h.pub.snapshot() {
		if e.message.Role != database.ChatMessageRoleAssistant {
			continue
		}
		assert.NotContains(t, e.message.Content, "OUT_OF", "marker must never be published")
		assert.NotContains(t, e.message.Content, "cake recipe", "nor anything streamed after it")
	}

	// refused first message: no title call, placeholder kept
	assert.Empty(t, prv.simpleCalls)
	assert.Equal(t, "Give me a cake recipe", h.db.session(res.Session.ID).Title)

	// still counts against the hourly limit
	assert.Len(t, h.db.usageRows(database.ChatUsageKindReply), 1)
}

func TestSend_RefusalInNonStreamedResponse(t *testing.T) {
	prv := newFakeProvider()
	prv.final = ptr("[[OUT_OF_SCOPE]]")
	h := newHarness(t, Limits{}, prv)

	_, reply := h.send(t, alice, nil, "What's the weather?")
	assert.Equal(t, database.ChatMessageStatusRefused, reply.Status)
	assert.Equal(t, refusalMessage, reply.Content)
}

func TestSend_ValidatesInput(t *testing.T) {
	h := newHarness(t, Limits{MaxInputChars: 10}, newFakeProvider("ok"))
	ctx := context.Background()

	_, err := h.svc.Send(ctx, alice, nil, "kimi", " \x00\n ")
	assertUserError(t, err, "empty")

	_, err = h.svc.Send(ctx, alice, nil, "kimi", strings.Repeat("x", 11))
	assertUserError(t, err, "too long")

	_, err = h.svc.Send(ctx, alice, nil, "", "hello")
	assertUserError(t, err, "select a provider")

	_, err = h.svc.Send(ctx, alice, nil, "nope", "hello")
	assertUserError(t, err, "not available")

	assert.Zero(t, h.prv.calls)
}

func TestSend_HourlyMessageLimit(t *testing.T) {
	h := newHarness(t, Limits{MaxMessagesPerHour: 2}, newFakeProvider("answer"))
	ctx := context.Background()

	res, _ := h.send(t, alice, nil, "q1")
	h.send(t, alice, &res.Session.ID, "q2")

	_, err := h.svc.Send(ctx, alice, &res.Session.ID, "kimi", "q3")
	assertUserError(t, err, "limit of 2 messages per hour")

	// deleting the chat must not hand the quota back
	require.NoError(t, h.svc.DeleteSession(ctx, alice, res.Session.ID))
	_, err = h.svc.Send(ctx, alice, nil, "kimi", "q3")
	assertUserError(t, err, "limit of 2 messages per hour")

	// other users are unaffected
	h.send(t, bob, nil, "q1")

	quota, err := h.svc.Quota(ctx, alice)
	require.NoError(t, err)
	assert.Equal(t, 2, quota.MessagesUsed)
	require.NotNil(t, quota.MessagesResetAt)
	assert.Equal(t, h.clock.Now().Add(time.Hour), *quota.MessagesResetAt)

	// the window rolls
	h.clock.Advance(time.Hour + time.Second)
	h.send(t, alice, nil, "q3")
}

func TestSend_DailyTokenBudget(t *testing.T) {
	prv := newFakeProvider("answer")
	prv.usage = pconfig.CallUsage{Input: 700, Output: 400}
	h := newHarness(t, Limits{DailyTokenBudget: 1000}, prv)
	ctx := context.Background()

	h.send(t, alice, nil, "q1")

	_, err := h.svc.Send(ctx, alice, nil, "kimi", "q2")
	assertUserError(t, err, "token budget")

	quota, err := h.svc.Quota(ctx, alice)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, quota.TokensUsed, int64(1100), "reply plus the estimated title call")

	h.clock.Advance(24*time.Hour + time.Second)
	h.send(t, alice, nil, "q2")
}

func TestSend_ProviderWithoutUsageIsEstimated(t *testing.T) {
	h := newHarness(t, Limits{}, newFakeProvider(strings.Repeat("x", 400)))

	h.send(t, alice, nil, "q1")

	usage := h.db.usageRows(database.ChatUsageKindReply)
	require.Len(t, usage, 1)
	assert.Positive(t, usage[0].UsageIn)
	assert.Equal(t, int64(100), usage[0].UsageOut)
}

func TestSend_FailureBeforeAnyOutputRefundsTheMessage(t *testing.T) {
	prv := newFakeProvider()
	prv.err = errors.New("upstream 500: secret-key=abc")
	h := newHarness(t, Limits{MaxMessagesPerHour: 1}, prv)

	res, reply := h.send(t, alice, nil, "q1")
	assert.Equal(t, database.ChatMessageStatusError, reply.Status)
	assert.Empty(t, reply.Content, "provider errors are not shown to the user")
	assert.Empty(t, h.db.usageRows(database.ChatUsageKindReply))

	// the refunded message can be retried
	h.prv.mx.Lock()
	h.prv.err = nil
	h.prv.chunks = []string{"ok"}
	h.prv.mx.Unlock()
	_, reply = h.send(t, alice, &res.Session.ID, "q1")
	assert.Equal(t, database.ChatMessageStatusDone, reply.Status)
}

func TestSend_OneReplyPerSessionAndTwoPerUser(t *testing.T) {
	prv := newFakeProvider("thinking...")
	prv.block = make(chan struct{})
	h := newHarness(t, Limits{}, prv)
	ctx := context.Background()

	first, err := h.svc.Send(ctx, alice, nil, "kimi", "q1")
	require.NoError(t, err)
	<-prv.started

	_, err = h.svc.Send(ctx, alice, &first.Session.ID, "kimi", "q2")
	assertUserError(t, err, "wait for the current reply")

	_, err = h.svc.Send(ctx, alice, nil, "kimi", "other chat")
	require.NoError(t, err)
	<-prv.started

	_, err = h.svc.Send(ctx, alice, nil, "kimi", "third chat")
	assertUserError(t, err, "2 replies in progress")

	// bob is not blocked by alice
	_, err = h.svc.Send(ctx, bob, nil, "kimi", "q1")
	require.NoError(t, err)

	close(prv.block)
	h.svc.Wait()
}

func TestStop_KeepsPartialReply(t *testing.T) {
	prv := newFakeProvider("Step 1: enumerate subdomains")
	prv.block = make(chan struct{})
	h := newHarness(t, Limits{}, prv)
	ctx := context.Background()

	res, err := h.svc.Send(ctx, alice, nil, "kimi", "plan a web test")
	require.NoError(t, err)
	<-prv.started

	// bob cannot stop alice's reply
	_, err = h.svc.Stop(ctx, bob, res.AssistantMessage.ID)
	assert.ErrorIs(t, err, ErrNotFound)

	msg, err := h.svc.Stop(ctx, alice, res.AssistantMessage.ID)
	require.NoError(t, err)
	assert.Equal(t, database.ChatMessageStatusStopped, msg.Status)
	assert.Equal(t, "Step 1: enumerate subdomains", msg.Content)

	h.svc.Wait()
	assert.Empty(t, prv.simpleCalls, "no title for a stopped reply")
	assert.Len(t, h.db.usageRows(database.ChatUsageKindReply), 1, "a stopped reply still counts")
}

func TestDelete_MidReplyStillCountsTokens(t *testing.T) {
	prv := newFakeProvider(strings.Repeat("y", 800))
	prv.block = make(chan struct{})
	h := newHarness(t, Limits{}, prv)
	ctx := context.Background()

	res, err := h.svc.Send(ctx, alice, nil, "kimi", "q1")
	require.NoError(t, err)
	<-prv.started

	require.NoError(t, h.svc.DeleteSession(ctx, alice, res.Session.ID))
	h.svc.Wait()

	usage := h.db.usageRows(database.ChatUsageKindReply)
	require.Len(t, usage, 1)
	assert.Equal(t, int64(200), usage[0].UsageOut)
	assert.False(t, usage[0].SessionID.Valid)
}

func TestSessionsArePrivate(t *testing.T) {
	h := newHarness(t, Limits{}, newFakeProvider("ok"))
	ctx := context.Background()

	res, _ := h.send(t, alice, nil, "alice's question")
	sid := res.Session.ID

	_, err := h.svc.GetSession(ctx, bob, sid)
	assert.ErrorIs(t, err, ErrNotFound)

	_, err = h.svc.ListMessages(ctx, bob, sid)
	assert.ErrorIs(t, err, ErrNotFound)

	_, err = h.svc.Send(ctx, bob, &sid, "kimi", "hijack")
	assert.ErrorIs(t, err, ErrNotFound)

	_, err = h.svc.RenameSession(ctx, bob, sid, "mine now")
	assert.ErrorIs(t, err, ErrNotFound)

	assert.ErrorIs(t, h.svc.DeleteSession(ctx, bob, sid), ErrNotFound)

	sessions, err := h.svc.ListSessions(ctx, bob)
	require.NoError(t, err)
	assert.Empty(t, sessions)

	msgs, err := h.svc.ListMessages(ctx, alice, sid)
	require.NoError(t, err)
	assert.Len(t, msgs, 2)
}

func TestRename(t *testing.T) {
	h := newHarness(t, Limits{}, newFakeProvider("ok"))
	ctx := context.Background()
	res, _ := h.send(t, alice, nil, "q1")

	s, err := h.svc.RenameSession(ctx, alice, res.Session.ID, "  Recon   notes ")
	require.NoError(t, err)
	assert.Equal(t, "Recon notes", s.Title)

	_, err = h.svc.RenameSession(ctx, alice, res.Session.ID, " ")
	assertUserError(t, err, "empty")
	_, err = h.svc.RenameSession(ctx, alice, res.Session.ID, strings.Repeat("t", 81))
	assertUserError(t, err, "at most 80")
}

func TestGeneratedTitleDoesNotOverrideRename(t *testing.T) {
	prv := newFakeProvider("ok")
	h := newHarness(t, Limits{}, prv)
	ctx := context.Background()

	// the user renames while the title is being generated
	prv.simple = func(prompt string) (string, error) {
		sessions, err := h.svc.ListSessions(ctx, alice)
		if err != nil || len(sessions) != 1 {
			return "", errors.New("expected one session")
		}
		_, err = h.svc.RenameSession(ctx, alice, sessions[0].ID, "My own title")
		return "Generated Title", err
	}

	res, _ := h.send(t, alice, nil, "q1")

	assert.Equal(t, "My own title", h.db.session(res.Session.ID).Title)
}

func TestContext_FoldsOldTurnsIntoSummary(t *testing.T) {
	question := strings.Repeat("q", 2000)
	prv := newFakeProvider(strings.Repeat("a", 2000))
	prv.simple = func(prompt string) (string, error) {
		if strings.Contains(prompt, "running summary") {
			return "SUMMARY: earlier recon of example.com", nil
		}
		return "Title", nil
	}

	// room for four earlier turns, not five
	base := estimateTokens(buildChain("", nil, question))
	perTurn := estimateTokens(buildChain("", []turn{{user: question, assistant: strings.Repeat("a", 2000)}}, question)) - base
	budget := base + 4*perTurn + perTurn/2
	h := newHarness(t, Limits{ContextTokens: budget}, prv)

	res, _ := h.send(t, alice, nil, question)
	sid := res.Session.ID
	for range 4 {
		h.send(t, alice, &sid, question)
	}
	assert.Empty(t, h.db.usageRows(database.ChatUsageKindSummary), "four turns still fit")

	_, reply := h.send(t, alice, &sid, question)
	require.Equal(t, database.ChatMessageStatusDone, reply.Status)

	session := h.db.session(sid)
	assert.Equal(t, "SUMMARY: earlier recon of example.com", session.Summary)
	assert.Positive(t, session.SummaryThroughID)
	assert.Len(t, h.db.usageRows(database.ChatUsageKindSummary), 1)

	chain := prv.lastChain
	assert.Equal(t, llms.ChatMessageTypeHuman, chain[1].Role)
	assert.Contains(t, chain[1].Parts[0].(llms.TextContent).Text, "SUMMARY: earlier recon")
	assert.Equal(t, question, chain[len(chain)-1].Parts[0].(llms.TextContent).Text)
	assert.LessOrEqual(t, estimateTokens(chain), budget)

	// history has room again: the next messages reuse the stored summary
	h.send(t, alice, &sid, question)
	h.send(t, alice, &sid, question)
	assert.Len(t, h.db.usageRows(database.ChatUsageKindSummary), 1)
	assert.Contains(t, prv.lastChain[1].Parts[0].(llms.TextContent).Text, "SUMMARY: earlier recon")
}

func TestMaxOutputTokens(t *testing.T) {
	prv := newFakeProvider("ok")
	h := newHarness(t, Limits{MaxOutputTokens: 8192}, prv)
	assert.Equal(t, 8192, h.svc.maxOutputTokens(prv), "no provider config: the chat cap")

	cfg, err := pconfig.LoadConfigData([]byte("assistant:\n  model: m\n  max_tokens: 4000\n"), nil)
	require.NoError(t, err)
	prv.cfg = cfg
	assert.Equal(t, 4000, h.svc.maxOutputTokens(prv), "the provider's lower max_tokens wins")

	h.svc.limits.MaxOutputTokens = 2048
	assert.Equal(t, 2048, h.svc.maxOutputTokens(prv))

	h.send(t, alice, nil, "q")
	require.NotNil(t, prv.lastOptions.MaxTokens)
	assert.Equal(t, 2048, *prv.lastOptions.MaxTokens)
}

func TestNewService_ClosesInterruptedReplies(t *testing.T) {
	clock := &fakeClock{now: time.Now()}
	db := newFakeDB(clock.Now)
	s, _ := db.CreateChatSession(context.Background(), database.CreateChatSessionParams{UserID: alice, Title: "t"})
	m, _ := db.CreateChatMessage(context.Background(), database.CreateChatMessageParams{
		SessionID: s.ID, Role: database.ChatMessageRoleAssistant, Status: database.ChatMessageStatusStreaming,
	})

	logger := logrus.New()
	logger.SetLevel(logrus.PanicLevel)
	NewService(context.Background(), db, &fakeResolver{}, &fakePublisher{}, Limits{MaxInputChars: 1}, logrus.NewEntry(logger))

	assert.Equal(t, database.ChatMessageStatusError, db.message(m.ID).Status)
}

func assertUserError(t *testing.T, err error, contains string) {
	t.Helper()

	var userErr *UserError
	require.ErrorAs(t, err, &userErr)
	assert.Contains(t, userErr.Error(), contains)
}

func TestSend_MarkerMidStreamIsRefused(t *testing.T) {
	prv := newFakeProvider("Note: ", "[[OUT_OF_SCOPE]]", " here is off-topic text")
	prv.block = make(chan struct{})
	h := newHarness(t, Limits{}, prv)

	_, reply := h.send(t, alice, nil, "bake me a cake")

	assert.Equal(t, database.ChatMessageStatusRefused, reply.Status)
	assert.Equal(t, refusalMessage, reply.Content)
	for _, e := range h.pub.snapshot() {
		if e.message.Role == database.ChatMessageRoleAssistant {
			assert.NotContains(t, e.message.Content, "[[")
			assert.NotContains(t, e.message.Content, "off-topic")
		}
	}
}

func TestTitleGenerationDoesNotBlockFollowUp(t *testing.T) {
	prv := newFakeProvider("ok")
	inTitle, release := make(chan struct{}), make(chan struct{})
	prv.simple = func(prompt string) (string, error) {
		close(inTitle)
		<-release
		return "Generated Title", nil
	}
	h := newHarness(t, Limits{}, prv)
	ctx := context.Background()

	res, err := h.svc.Send(ctx, alice, nil, "kimi", "q1")
	require.NoError(t, err)
	<-inTitle

	assert.Equal(t, database.ChatMessageStatusDone, h.db.message(res.AssistantMessage.ID).Status)
	_, err = h.svc.Send(ctx, alice, &res.Session.ID, "kimi", "follow-up while the title is generated")
	require.NoError(t, err, "a finished reply must not keep the session busy")

	close(release)
	h.svc.Wait()
	assert.Equal(t, "Generated Title", h.db.session(res.Session.ID).Title)
}

func TestSend_ReservationCountsRepliesInFlight(t *testing.T) {
	prv := newFakeProvider("answer")
	prv.block = make(chan struct{})
	prv.usage = pconfig.CallUsage{Input: 900, Output: 100}
	h := newHarness(t, Limits{DailyTokenBudget: 30000, ContextTokens: 24000, MaxOutputTokens: 8192}, prv)
	ctx := context.Background()

	_, err := h.svc.Send(ctx, alice, nil, "kimi", "q1")
	require.NoError(t, err)
	<-prv.started

	quota, err := h.svc.Quota(ctx, alice)
	require.NoError(t, err)
	assert.Equal(t, int64(24000+8192), quota.TokensUsed, "worst case reserved while in flight")

	_, err = h.svc.Send(ctx, alice, nil, "kimi", "q2 at the same time")
	assertUserError(t, err, "token budget")

	close(prv.block)
	h.svc.Wait()

	quota, err = h.svc.Quota(ctx, alice)
	require.NoError(t, err)
	assert.Less(t, quota.TokensUsed, int64(2000), "reservation replaced by real usage")
	h.send(t, alice, nil, "q2")
}

func TestStop_DuringReasoningStillCountsReasoning(t *testing.T) {
	prv := newFakeProvider()
	prv.reasoning = []string{strings.Repeat("r", 800)}
	prv.block = make(chan struct{})
	h := newHarness(t, Limits{}, prv)
	ctx := context.Background()

	res, err := h.svc.Send(ctx, alice, nil, "kimi", "q1")
	require.NoError(t, err)
	<-prv.started

	msg, err := h.svc.Stop(ctx, alice, res.AssistantMessage.ID)
	require.NoError(t, err)
	assert.Equal(t, database.ChatMessageStatusStopped, msg.Status)
	h.svc.Wait()

	usage := h.db.usageRows(database.ChatUsageKindReply)
	require.Len(t, usage, 1)
	assert.Equal(t, int64(200), usage[0].UsageOut)
}

func TestTitleUsageCountedWhenSessionDeletedMeanwhile(t *testing.T) {
	prv := newFakeProvider("ok")
	h := newHarness(t, Limits{}, prv)
	ctx := context.Background()

	prv.simple = func(prompt string) (string, error) {
		sessions, _ := h.svc.ListSessions(ctx, alice)
		for _, s := range sessions {
			_ = h.svc.DeleteSession(ctx, alice, s.ID)
		}
		return "Generated Title", nil
	}

	h.send(t, alice, nil, "q1")

	titles := h.db.usageRows(database.ChatUsageKindTitle)
	require.Len(t, titles, 1)
	assert.False(t, titles[0].SessionID.Valid)
	assert.Positive(t, titles[0].UsageIn)
}
