package graph

import (
	"strings"
	"testing"

	"pentagi/pkg/database"
	"pentagi/pkg/graph/model"
)

func TestNormalizeTemplateContent(t *testing.T) {
	content, err := normalizeTemplateContent("  Recon  ", "\n scan it \n", nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if content.title != "Recon" || content.text != "scan it" {
		t.Fatalf("content not trimmed: %+v", content)
	}
	if len(content.targetTypes) != 1 || content.targetTypes[0] != database.TargetTypeGeneral {
		t.Fatalf("target types should default to general: %v", content.targetTypes)
	}

	cases := map[string]struct {
		title, text string
		types       []model.TargetType
	}{
		"blank title":     {"   ", "text", nil},
		"blank text":      {"title", " \n ", nil},
		"long title":      {strings.Repeat("a", maxTemplateTitleLength+1), "text", nil},
		"long text":       {"title", strings.Repeat("a", maxTemplateTextLength+1), nil},
		"bad target type": {"title", "text", []model.TargetType{"nope"}},
	}
	for name, tc := range cases {
		if _, err := normalizeTemplateContent(tc.title, tc.text, tc.types); err == nil {
			t.Errorf("%s: expected an error", name)
		}
	}
}

func TestTemplateContentSameAsTemplate(t *testing.T) {
	template := database.FlowTemplate{
		Title:       "Recon",
		Text:        "scan it",
		TargetTypes: []database.TargetType{database.TargetTypeWebApp, database.TargetTypeApi},
	}

	content, _ := normalizeTemplateContent("Recon", "scan it", []model.TargetType{model.TargetTypeAPI, model.TargetTypeWebApp})
	if !content.sameAsTemplate(template) {
		t.Fatalf("reordered target types should count as unchanged")
	}

	content, _ = normalizeTemplateContent("Recon", "scan it", []model.TargetType{model.TargetTypeAPI})
	if content.sameAsTemplate(template) {
		t.Fatalf("dropping a target type is a change")
	}

	content, _ = normalizeTemplateContent("Recon", "scan it harder", []model.TargetType{model.TargetTypeAPI, model.TargetTypeWebApp})
	if content.sameAsTemplate(template) {
		t.Fatalf("new text is a change")
	}
}
