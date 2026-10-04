package chat

import (
	"strings"
)

type guardState int

const (
	// guardHolding: too little text yet to tell an answer from the marker.
	guardHolding guardState = iota
	guardPassed
	guardRefused
)

// streamGuard holds back the start of a streamed reply until it is clear the
// model is not emitting refusalMarker, so the marker never reaches a client
// and a refused reply never flashes partial text.
type streamGuard struct {
	raw   strings.Builder
	state guardState
}

func (g *streamGuard) Feed(chunk string) guardState {
	g.raw.WriteString(chunk)
	if g.state != guardHolding {
		return g.state
	}

	g.state = classifyHead(g.raw.String())
	return g.state
}

func (g *streamGuard) State() guardState {
	return g.state
}

// Visible is the text that may be shown so far: nothing while holding or
// after a refusal.
func (g *streamGuard) Visible() string {
	if g.state != guardPassed {
		return ""
	}

	return strings.TrimLeft(g.raw.String(), " \t\r\n")
}

func classifyHead(text string) guardState {
	head := strings.ToUpper(strings.TrimLeft(text, " \t\r\n"))
	if len(head) >= len(refusalMarker) {
		if strings.HasPrefix(head, refusalMarker) {
			return guardRefused
		}
		return guardPassed
	}

	if strings.HasPrefix(refusalMarker, head) {
		return guardHolding
	}

	return guardPassed
}

// isRefusal checks a complete reply. Besides the leading marker it catches a
// model that buried the marker inside some text despite the instructions.
func isRefusal(content string) bool {
	return classifyHead(content) == guardRefused ||
		strings.Contains(strings.ToUpper(content), refusalMarker)
}
