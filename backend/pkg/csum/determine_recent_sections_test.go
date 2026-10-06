package csum

import (
	"testing"

	"pentagi/pkg/cast"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/vxcontrol/langchaingo/llms"
)

// TestDetermineRecentSectionsToKeepClampsToSectionCount guards the lower-bound
// clamp: when keepQASections exceeds the number of sections, the recent-section
// loop must not index below zero. Before the clamp this panicked with an
// out-of-range access on ast.Sections.
func TestDetermineRecentSectionsToKeepClampsToSectionCount(t *testing.T) {
	section := func(q string) *cast.ChainSection {
		return cast.NewChainSection(
			cast.NewHeader(nil, newTextMsg(llms.ChatMessageTypeHuman, q)),
			[]*cast.BodyPair{cast.NewBodyPairFromCompletion("answer to " + q)},
		)
	}
	ast := createTestChainAST(section("Q1"), section("Q2"))

	var keep int
	require.NotPanics(t, func() {
		// keepQASections (5) deliberately exceeds the 2 available sections.
		keep = determineRecentSectionsToKeep(ast, 5, 10, 64*1024)
	})
	assert.Equal(t, len(ast.Sections), keep, "cannot keep more sections than exist")
}
