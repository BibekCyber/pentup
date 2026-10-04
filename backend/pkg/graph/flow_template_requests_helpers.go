package graph

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"slices"
	"strings"
	"unicode/utf8"

	"pentagi/pkg/database"
	"pentagi/pkg/graph/model"

	"github.com/lib/pq"
)

const (
	maxTemplateTitleLength = 200
	maxTemplateTextLength  = 20000
	maxReviewNoteLength    = 2000

	// maxPendingTemplateRequests caps how many requests one user can have
	// waiting for review, so the review queue cannot be flooded.
	maxPendingTemplateRequests = 10

	pqUniqueViolation = "23505"
)

var errTemplateNotFound = errors.New("template not found")

// validateTemplateSession checks the privilege and that the caller is a logged
// in user (API tokens never manage templates). isAdmin reports templates.admin,
// which is what every direct write to the shared library requires: the User
// role keeps templates.create / templates.edit, but for them those privileges
// only allow submitting requests for approval.
func validateTemplateSession(ctx context.Context, perm string) (int64, bool, error) {
	uid, isAdmin, err := validatePermission(ctx, perm)
	if err != nil {
		return 0, false, err
	}

	isUserSession, err := validateUserType(ctx, userSessionTypes...)
	if err != nil {
		return 0, false, err
	}

	if !isUserSession {
		return 0, false, fmt.Errorf("unauthorized: non-user session is not allowed to manage templates")
	}

	return uid, isAdmin, nil
}

type templateContent struct {
	title       string
	text        string
	targetTypes []database.TargetType
}

// normalizeTemplateContent trims and validates user-supplied template content.
// It is the server-side source of truth; the UI mirrors these limits.
func normalizeTemplateContent(title, text string, targetTypes []model.TargetType) (templateContent, error) {
	title = strings.TrimSpace(title)
	text = strings.TrimSpace(text)

	switch {
	case title == "":
		return templateContent{}, fmt.Errorf("title is required")
	case utf8.RuneCountInString(title) > maxTemplateTitleLength:
		return templateContent{}, fmt.Errorf("title must be at most %d characters", maxTemplateTitleLength)
	case text == "":
		return templateContent{}, fmt.Errorf("content is required")
	case utf8.RuneCountInString(text) > maxTemplateTextLength:
		return templateContent{}, fmt.Errorf("content must be at most %d characters", maxTemplateTextLength)
	}

	normalized, err := normalizeTargetTypes(targetTypes)
	if err != nil {
		return templateContent{}, err
	}

	return templateContent{title: title, text: text, targetTypes: normalized}, nil
}

// sameAsTemplate reports whether the proposed content would change nothing.
func (c templateContent) sameAsTemplate(template database.FlowTemplate) bool {
	if c.title != template.Title || c.text != template.Text {
		return false
	}

	if len(c.targetTypes) != len(template.TargetTypes) {
		return false
	}

	for _, t := range c.targetTypes {
		if !slices.Contains(template.TargetTypes, t) {
			return false
		}
	}

	return true
}

func normalizeReviewNote(note string) (string, error) {
	note = strings.TrimSpace(note)
	if utf8.RuneCountInString(note) > maxReviewNoteLength {
		return "", fmt.Errorf("note must be at most %d characters", maxReviewNoteLength)
	}

	return note, nil
}

func isUniqueViolation(err error) bool {
	var pqErr *pq.Error
	return errors.As(err, &pqErr) && pqErr.Code == pqUniqueViolation
}

func flowTemplateFromRow(
	id int64,
	userID sql.NullInt64,
	title, text string,
	createdAt, updatedAt sql.NullTime,
	targetTypes []database.TargetType,
	systemOwned bool,
	version int32,
	archivedAt sql.NullTime,
) database.FlowTemplate {
	return database.FlowTemplate{
		ID:          id,
		UserID:      userID,
		Title:       title,
		Text:        text,
		CreatedAt:   createdAt,
		UpdatedAt:   updatedAt,
		TargetTypes: targetTypes,
		SystemOwned: systemOwned,
		Version:     version,
		ArchivedAt:  archivedAt,
	}
}

// getVisibleTemplateRequest loads a request the caller may see: admins see
// every request, everyone else only their own. Requests owned by someone else
// are reported as not found so their existence is not leaked.
func (r *Resolver) getVisibleTemplateRequest(
	ctx context.Context,
	requestID, uid int64,
	isAdmin bool,
) (database.FlowTemplateRequestsView, error) {
	request, err := r.DB.GetFlowTemplateRequest(ctx, requestID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return request, fmt.Errorf("request not found")
		}
		return request, fmt.Errorf("failed to get request: %w", err)
	}

	if !isAdmin && request.RequesterID != uid {
		return request, fmt.Errorf("request not found")
	}

	return request, nil
}

// explainTemplateRequestConflict turns a guarded write that matched no row
// into a precise message, by re-reading what changed underneath the caller.
func (r *Resolver) explainTemplateRequestConflict(
	ctx context.Context,
	requestID int64,
	revision int,
	templateVersion *int,
) error {
	request, err := r.DB.GetFlowTemplateRequest(ctx, requestID)
	if err != nil {
		return fmt.Errorf("request not found")
	}

	if request.Status != database.TemplateRequestStatusPending {
		return fmt.Errorf("this request is no longer pending (it was %s)", request.Status)
	}

	if int(request.Revision) != revision {
		return fmt.Errorf("this request was changed after you opened it; reload to see the latest version")
	}

	if request.Kind == database.TemplateRequestKindUpdate && request.TemplateID.Valid {
		template, err := r.DB.GetFlowTemplate(ctx, request.TemplateID.Int64)
		if err != nil {
			return fmt.Errorf("the template this request edits no longer exists")
		}
		if templateVersion != nil && int(template.Version) != *templateVersion {
			return fmt.Errorf("the live template changed after you opened this request; reload to review the current changes")
		}
	}

	return fmt.Errorf("the request could not be updated; reload and try again")
}

// publishTemplateRequestUpdated notifies the requester and all reviewers.
func (r *Resolver) publishTemplateRequestUpdated(ctx context.Context, requestID int64) (*database.FlowTemplateRequestsView, error) {
	request, err := r.DB.GetFlowTemplateRequest(ctx, requestID)
	if err != nil {
		return nil, fmt.Errorf("failed to reload request: %w", err)
	}

	r.Subscriptions.NewFlowPublisher(request.RequesterID, 0).FlowTemplateRequestUpdated(ctx, request)

	return &request, nil
}
