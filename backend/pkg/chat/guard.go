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

// headDecoration is what a model may wrap the marker in (emphasis, code,
// quotes, a heading or quote prefix); it is skipped when looking at how a
// reply starts.
const headDecoration = " \t\r\n*_`\"'>#"

// streamGuard decides what of a streamed reply may be shown. It holds back
// the start until it is clear the model is not answering with refusalMarker,
// refuses as soon as the marker appears anywhere, and never shows a trailing
// fragment that could be the beginning of the marker.
type streamGuard struct {
	raw   strings.Builder
	state guardState
}

func (g *streamGuard) Feed(chunk string) guardState {
	g.raw.WriteString(chunk)
	if g.state == guardRefused {
		return g.state
	}

	text := g.raw.String()
	if containsMarker(text) {
		g.state = guardRefused
	} else if g.state == guardHolding {
		g.state = classifyHead(text)
	}

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

	text := strings.TrimLeft(g.raw.String(), " \t\r\n")
	return text[:len(text)-markerPrefixSuffix(text)]
}

func classifyHead(text string) guardState {
	head := asciiUpper(strings.TrimLeft(text, headDecoration))
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

func containsMarker(text string) bool {
	return strings.Contains(asciiUpper(text), refusalMarker)
}

// markerPrefixSuffix is the length of the longest suffix of text that is a
// prefix of the marker, i.e. a marker that may still be arriving.
func markerPrefixSuffix(text string) int {
	upper := asciiUpper(text)
	for n := min(len(refusalMarker)-1, len(upper)); n > 0; n-- {
		if strings.HasSuffix(upper, refusalMarker[:n]) {
			return n
		}
	}

	return 0
}

// isRefusal checks a complete (or cut off) reply for the marker anywhere.
func isRefusal(content string) bool {
	return classifyHead(content) == guardRefused || containsMarker(content)
}

// asciiUpper upper-cases ASCII letters only. Unlike strings.ToUpper it keeps
// byte offsets intact, which Visible relies on, and the marker is ASCII.
func asciiUpper(s string) string {
	b := []byte(s)
	for i, c := range b {
		if 'a' <= c && c <= 'z' {
			b[i] = c - ('a' - 'A')
		}
	}

	return string(b)
}
