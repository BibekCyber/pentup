package cast

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/vxcontrol/langchaingo/llms"
)

// TestSanitizeJSONControlChars covers escaping of literal control characters in
// JSON string values (what some LLMs emit) while leaving valid JSON untouched.
func TestSanitizeJSONControlChars(t *testing.T) {
	cases := []struct{ name, in, want string }{
		{"valid json unchanged", `{"a":"b"}`, `{"a":"b"}`},
		{"literal newline in string escaped", "{\"input\":\"ls\n-la\"}", `{"input":"ls\n-la"}`},
		{"literal tab in string escaped", "{\"x\":\"a\tb\"}", `{"x":"a\tb"}`},
		{"already-escaped not doubled", `{"x":"a\nb"}`, `{"x":"a\nb"}`},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := SanitizeJSONControlChars(c.in)
			assert.Equal(t, c.want, got)
			assert.True(t, json.Valid([]byte(got)), "result must be valid JSON")
		})
	}
}

// TestSanitizeToolCallArgumentsFallsBackToEmptyObject covers the 161afb8b fix: a
// tool call whose arguments are truncated/invalid JSON is replaced with {} so the
// chain replays without a 400 and the tool-call fixer can regenerate them.
func TestSanitizeToolCallArgumentsFallsBackToEmptyObject(t *testing.T) {
	mk := func(args string) *ChainAST {
		ai := &llms.MessageContent{
			Role: llms.ChatMessageTypeAI,
			Parts: []llms.ContentPart{
				llms.ToolCall{ID: "c1", Type: "function", FunctionCall: &llms.FunctionCall{Name: "terminal", Arguments: args}},
			},
		}
		tool := &llms.MessageContent{
			Role:  llms.ChatMessageTypeTool,
			Parts: []llms.ContentPart{llms.ToolCallResponse{ToolCallID: "c1", Name: "terminal", Content: "ok"}},
		}
		bp := NewBodyPair(ai, []*llms.MessageContent{tool})
		sec := NewChainSection(NewHeader(nil, nil), []*BodyPair{bp})
		return &ChainAST{Sections: []*ChainSection{sec}}
	}
	argsOf := func(ast *ChainAST) string {
		return ast.Sections[0].Body[0].AIMessage.Parts[0].(llms.ToolCall).FunctionCall.Arguments
	}

	for _, c := range []struct{ name, in, want string }{
		{"truncated opening brace", `{`, `{}`},
		{"partial object", `{"input": "ls -la"`, `{}`},
		{"empty string", ``, `{}`},
		{"valid object preserved", `{"input":"ls"}`, `{"input":"ls"}`},
	} {
		t.Run(c.name, func(t *testing.T) {
			ast := mk(c.in)
			ast.SanitizeToolCallArguments()
			assert.Equal(t, c.want, argsOf(ast))
		})
	}
}
