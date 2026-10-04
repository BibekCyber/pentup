package chat

import (
	"pentagi/pkg/cast"
	"pentagi/pkg/database"

	"github.com/vxcontrol/langchaingo/llms"
)

const (
	// bytesPerToken matches the rough estimate the provider wrapper uses.
	bytesPerToken = 4

	summaryIntro = "Summary of our earlier conversation, for context only:\n\n"
	summaryAck   = "Understood. I will use that summary as context."
)

// turn is one completed question and answer.
type turn struct {
	user      string
	assistant string
	// lastID is the id of the turn's assistant message: folding the turn into
	// the summary moves summary_through_id up to it.
	lastID int64
}

// collectTurns pairs each user message with the reply that follows it. Only
// replies that finished normally become context; refused, failed and stopped
// exchanges are left out so they cannot steer later answers. The message
// being answered now (currentID) and anything after it are excluded.
func collectTurns(messages []database.ChatMessage, currentID int64) []turn {
	var (
		turns   []turn
		pending *database.ChatMessage
	)

	for idx := range messages {
		msg := &messages[idx]
		if msg.ID >= currentID {
			break
		}

		switch msg.Role {
		case database.ChatMessageRoleUser:
			pending = msg
		case database.ChatMessageRoleAssistant:
			if pending != nil && msg.Status == database.ChatMessageStatusDone && msg.Content != "" {
				turns = append(turns, turn{
					user:      pending.Content,
					assistant: msg.Content,
					lastID:    msg.ID,
				})
			}
			pending = nil
		}
	}

	return turns
}

func buildChain(summary string, turns []turn, question string) []llms.MessageContent {
	chain := make([]llms.MessageContent, 0, len(turns)*2+4)
	chain = append(chain, llms.TextParts(llms.ChatMessageTypeSystem, systemPrompt))

	// The summary is derived from user content, so it travels as a user
	// message, never inside the system prompt.
	if summary != "" {
		chain = append(chain,
			llms.TextParts(llms.ChatMessageTypeHuman, summaryIntro+summary),
			llms.TextParts(llms.ChatMessageTypeAI, summaryAck),
		)
	}

	for _, t := range turns {
		chain = append(chain,
			llms.TextParts(llms.ChatMessageTypeHuman, t.user),
			llms.TextParts(llms.ChatMessageTypeAI, t.assistant),
		)
	}

	return append(chain, llms.TextParts(llms.ChatMessageTypeHuman, question))
}

func estimateTokens(chain []llms.MessageContent) int {
	size := 0
	for idx := range chain {
		size += cast.CalculateMessageSize(&chain[idx])
	}

	return size / bytesPerToken
}

func estimateTextTokens(text string) int {
	return len(text) / bytesPerToken
}

// splitForSummary decides which turns to fold into the summary once the chain
// outgrows the budget. It keeps only the newest turns that fit in half the
// budget, so history has room to grow again and the summary call happens
// every several messages instead of on every one. Returns no fold while the
// chain fits.
func splitForSummary(summary string, turns []turn, question string, budget int) (fold, keep []turn) {
	if budget <= 0 || len(turns) == 0 || estimateTokens(buildChain(summary, turns, question)) <= budget {
		return nil, turns
	}

	cut := len(turns)
	for cut > 0 && estimateTokens(buildChain(summary, turns[cut-1:], question)) <= budget/2 {
		cut--
	}

	return turns[:cut], turns[cut:]
}

// trimToBudget drops the oldest turns until the chain fits. It is the last
// resort when folding was not possible or not enough; the current question is
// always kept.
func trimToBudget(summary string, turns []turn, question string, budget int) []turn {
	if budget <= 0 {
		return turns
	}

	for len(turns) > 0 && estimateTokens(buildChain(summary, turns, question)) > budget {
		turns = turns[1:]
	}

	return turns
}
