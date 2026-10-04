package database

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"testing"

	_ "github.com/lib/pq"
)

// These tests exercise the guarded state transitions of the template approval
// workflow against a real PostgreSQL with all migrations applied. They are
// skipped unless PENTAGI_TEST_DATABASE_URL points at such a (disposable) DB.
func openTemplateTestDB(t *testing.T) (*sql.DB, *Queries) {
	t.Helper()

	dsn := os.Getenv("PENTAGI_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("PENTAGI_TEST_DATABASE_URL not set")
	}

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	t.Cleanup(func() { db.Close() })

	return db, New(db)
}

func createTemplateTestUser(t *testing.T, db *sql.DB, name string) int64 {
	t.Helper()

	var id int64
	err := db.QueryRow(
		`INSERT INTO users (mail, name, status, role_id) VALUES ($1 || '-' || md5(random()::text) || '@test.local', $1, 'active', 2) RETURNING id`,
		name,
	).Scan(&id)
	if err != nil {
		t.Fatalf("create user: %v", err)
	}
	t.Cleanup(func() { db.Exec(`DELETE FROM users WHERE id = $1`, id) })

	return id
}

func adminTestUserID(t *testing.T, db *sql.DB) int64 {
	t.Helper()

	var id int64
	if err := db.QueryRow(`SELECT MIN(id) FROM users WHERE role_id = 1`).Scan(&id); err != nil {
		t.Fatalf("find admin: %v", err)
	}

	return id
}

func submitCreateRequest(t *testing.T, q *Queries, requesterID int64, title string) FlowTemplateRequest {
	t.Helper()

	req, err := q.CreateFlowTemplateRequest(context.Background(), CreateFlowTemplateRequestParams{
		Kind:        TemplateRequestKindCreate,
		RequesterID: requesterID,
		Title:       title,
		Text:        "test the target",
		TargetTypes: []TargetType{TargetTypeWebApp},
	})
	if err != nil {
		t.Fatalf("create request: %v", err)
	}

	return req
}

func TestApproveCreateRequestPublishesAndLinksTemplate(t *testing.T) {
	ctx := context.Background()
	db, q := openTemplateTestDB(t)
	admin := adminTestUserID(t, db)
	alice := createTemplateTestUser(t, db, "alice")

	req := submitCreateRequest(t, q, alice, "Alice recon")

	// A stale revision must not approve.
	if _, err := q.ApproveCreateFlowTemplateRequest(ctx, ApproveCreateFlowTemplateRequestParams{
		ID: req.ID, Revision: req.Revision + 1, ReviewerID: admin,
	}); !errors.Is(err, sql.ErrNoRows) {
		t.Fatalf("stale revision: want ErrNoRows, got %v", err)
	}

	template, err := q.ApproveCreateFlowTemplateRequest(ctx, ApproveCreateFlowTemplateRequestParams{
		ID: req.ID, Revision: req.Revision, ReviewerID: admin,
	})
	if err != nil {
		t.Fatalf("approve: %v", err)
	}
	t.Cleanup(func() { db.Exec(`DELETE FROM flow_templates WHERE id = $1`, template.ID) })

	if template.Title != "Alice recon" || !template.UserID.Valid || template.UserID.Int64 != alice || template.Version != 1 {
		t.Fatalf("unexpected template: %+v", template)
	}

	view, err := q.GetFlowTemplateRequest(ctx, req.ID)
	if err != nil {
		t.Fatalf("reload: %v", err)
	}
	if view.Status != TemplateRequestStatusApproved || view.TemplateID.Int64 != template.ID || view.RequesterName != "alice" {
		t.Fatalf("unexpected request after approval: %+v", view)
	}

	// Approving twice is a no-op, never a second template.
	if _, err := q.ApproveCreateFlowTemplateRequest(ctx, ApproveCreateFlowTemplateRequestParams{
		ID: req.ID, Revision: req.Revision, ReviewerID: admin,
	}); !errors.Is(err, sql.ErrNoRows) {
		t.Fatalf("double approve: want ErrNoRows, got %v", err)
	}

	if _, err := q.GetFlowTemplate(ctx, template.ID); err != nil {
		t.Fatalf("approved template not visible: %v", err)
	}
}

func TestApproveUpdateRequestGuards(t *testing.T) {
	ctx := context.Background()
	db, q := openTemplateTestDB(t)
	admin := adminTestUserID(t, db)
	alice := createTemplateTestUser(t, db, "alice")

	template, err := q.CreateFlowTemplate(ctx, CreateFlowTemplateParams{
		UserID: alice, Title: "Original", Text: "original text", TargetTypes: []TargetType{TargetTypeApi},
	})
	if err != nil {
		t.Fatalf("create template: %v", err)
	}
	t.Cleanup(func() { db.Exec(`DELETE FROM flow_templates WHERE id = $1`, template.ID) })

	edit, err := q.CreateFlowTemplateRequest(ctx, CreateFlowTemplateRequestParams{
		Kind:        TemplateRequestKindUpdate,
		TemplateID:  sql.NullInt64{Int64: template.ID, Valid: true},
		RequesterID: alice,
		Title:       "Edited",
		Text:        "edited text",
		TargetTypes: []TargetType{TargetTypeApi},
		BaseVersion: sql.NullInt32{Int32: template.Version, Valid: true},
	})
	if err != nil {
		t.Fatalf("create edit request: %v", err)
	}

	// Only one pending edit per template.
	_, err = q.CreateFlowTemplateRequest(ctx, CreateFlowTemplateRequestParams{
		Kind:        TemplateRequestKindUpdate,
		TemplateID:  sql.NullInt64{Int64: template.ID, Valid: true},
		RequesterID: alice,
		Title:       "Second",
		Text:        "second",
		TargetTypes: []TargetType{TargetTypeApi},
	})
	if err == nil {
		t.Fatalf("second pending edit should violate the unique index")
	}

	// An admin edits the live template meanwhile: version 1 -> 2.
	if _, err := q.UpdateFlowTemplate(ctx, UpdateFlowTemplateParams{
		ID: template.ID, Title: "Admin fix", Text: "admin text", TargetTypes: []TargetType{TargetTypeApi},
		ExpectedVersion: sql.NullInt32{Int32: 1, Valid: true},
	}); err != nil {
		t.Fatalf("admin update: %v", err)
	}

	// The same stale-version guard protects direct edits.
	if _, err := q.UpdateFlowTemplate(ctx, UpdateFlowTemplateParams{
		ID: template.ID, Title: "Lost update", Text: "x", TargetTypes: []TargetType{TargetTypeApi},
		ExpectedVersion: sql.NullInt32{Int32: 1, Valid: true},
	}); !errors.Is(err, sql.ErrNoRows) {
		t.Fatalf("stale direct edit: want ErrNoRows, got %v", err)
	}

	// Approving against the version the reviewer no longer sees must fail and
	// leave the request pending (no half-applied approval).
	if _, err := q.ApproveUpdateFlowTemplateRequest(ctx, ApproveUpdateFlowTemplateRequestParams{
		ID: edit.ID, Revision: edit.Revision, TemplateVersion: 1, ReviewerID: admin,
	}); !errors.Is(err, sql.ErrNoRows) {
		t.Fatalf("stale template version: want ErrNoRows, got %v", err)
	}
	if view, _ := q.GetFlowTemplateRequest(ctx, edit.ID); view.Status != TemplateRequestStatusPending {
		t.Fatalf("request must stay pending after a refused approval, got %s", view.Status)
	}

	// The requester edits the pending request: revision 1 -> 2.
	edited, err := q.UpdatePendingFlowTemplateRequest(ctx, UpdatePendingFlowTemplateRequestParams{
		ID: edit.ID, RequesterID: alice, Revision: edit.Revision,
		Title: "Edited v2", Text: "edited text v2", TargetTypes: []TargetType{TargetTypeApi, TargetTypeWebApp},
		BaseVersion: edit.BaseVersion,
	})
	if err != nil {
		t.Fatalf("edit pending: %v", err)
	}
	if edited.Revision != 2 {
		t.Fatalf("want revision 2, got %d", edited.Revision)
	}

	// Reviewer looking at revision 1 cannot approve or reject revision 2.
	if _, err := q.ApproveUpdateFlowTemplateRequest(ctx, ApproveUpdateFlowTemplateRequestParams{
		ID: edit.ID, Revision: 1, TemplateVersion: 2, ReviewerID: admin,
	}); !errors.Is(err, sql.ErrNoRows) {
		t.Fatalf("stale revision approve: want ErrNoRows, got %v", err)
	}
	if _, err := q.RejectFlowTemplateRequest(ctx, RejectFlowTemplateRequestParams{
		ID: edit.ID, Revision: 1, ReviewNote: "no", ReviewerID: admin,
	}); !errors.Is(err, sql.ErrNoRows) {
		t.Fatalf("stale revision reject: want ErrNoRows, got %v", err)
	}

	row, err := q.ApproveUpdateFlowTemplateRequest(ctx, ApproveUpdateFlowTemplateRequestParams{
		ID: edit.ID, Revision: 2, TemplateVersion: 2, ReviewerID: admin,
		ReviewNote: sql.NullString{String: "looks good", Valid: true},
	})
	if err != nil {
		t.Fatalf("approve edit: %v", err)
	}
	if row.Title != "Edited v2" || row.Version != 3 || len(row.TargetTypes) != 2 || row.UserID.Int64 != alice {
		t.Fatalf("unexpected template after approval: %+v", row)
	}

	view, err := q.GetFlowTemplateRequest(ctx, edit.ID)
	if err != nil {
		t.Fatalf("reload: %v", err)
	}
	if view.Status != TemplateRequestStatusApproved || view.ReviewNote.String != "looks good" || view.ReviewerName == "" {
		t.Fatalf("unexpected request after approval: %+v", view)
	}

	// With the edit resolved, a new one can be opened.
	next, err := q.CreateFlowTemplateRequest(ctx, CreateFlowTemplateRequestParams{
		Kind:        TemplateRequestKindUpdate,
		TemplateID:  sql.NullInt64{Int64: template.ID, Valid: true},
		RequesterID: alice,
		Title:       "Next",
		Text:        "next",
		TargetTypes: []TargetType{TargetTypeApi},
	})
	if err != nil {
		t.Fatalf("new edit after approval: %v", err)
	}

	// Archiving the template closes its open edit in the same statement.
	archived, err := q.ArchiveFlowTemplate(ctx, ArchiveFlowTemplateParams{ID: template.ID, ReviewerID: admin})
	if err != nil {
		t.Fatalf("archive: %v", err)
	}
	if archived.ClosedRequestID != next.ID || !archived.ArchivedAt.Valid {
		t.Fatalf("unexpected archive row: %+v", archived)
	}
	if view, _ := q.GetFlowTemplateRequest(ctx, next.ID); view.Status != TemplateRequestStatusClosed {
		t.Fatalf("pending edit should be closed, got %s", view.Status)
	}
	if _, err := q.GetFlowTemplate(ctx, template.ID); !errors.Is(err, sql.ErrNoRows) {
		t.Fatalf("archived template must be hidden, got %v", err)
	}
	if _, err := q.ArchiveFlowTemplate(ctx, ArchiveFlowTemplateParams{ID: template.ID, ReviewerID: admin}); !errors.Is(err, sql.ErrNoRows) {
		t.Fatalf("double archive: want ErrNoRows, got %v", err)
	}
}

func TestWithdrawAndRejectOnlyWhilePending(t *testing.T) {
	ctx := context.Background()
	db, q := openTemplateTestDB(t)
	admin := adminTestUserID(t, db)
	alice := createTemplateTestUser(t, db, "alice")
	bob := createTemplateTestUser(t, db, "bob")

	req := submitCreateRequest(t, q, alice, "To withdraw")

	// Someone else cannot withdraw it.
	if _, err := q.WithdrawFlowTemplateRequest(ctx, WithdrawFlowTemplateRequestParams{ID: req.ID, RequesterID: bob}); !errors.Is(err, sql.ErrNoRows) {
		t.Fatalf("foreign withdraw: want ErrNoRows, got %v", err)
	}
	if _, err := q.WithdrawFlowTemplateRequest(ctx, WithdrawFlowTemplateRequestParams{ID: req.ID, RequesterID: alice}); err != nil {
		t.Fatalf("withdraw: %v", err)
	}
	// A withdrawn request can no longer be approved, rejected or edited.
	if _, err := q.ApproveCreateFlowTemplateRequest(ctx, ApproveCreateFlowTemplateRequestParams{
		ID: req.ID, Revision: req.Revision, ReviewerID: admin,
	}); !errors.Is(err, sql.ErrNoRows) {
		t.Fatalf("approve withdrawn: want ErrNoRows, got %v", err)
	}
	if _, err := q.RejectFlowTemplateRequest(ctx, RejectFlowTemplateRequestParams{
		ID: req.ID, Revision: req.Revision, ReviewNote: "x", ReviewerID: admin,
	}); !errors.Is(err, sql.ErrNoRows) {
		t.Fatalf("reject withdrawn: want ErrNoRows, got %v", err)
	}
	if _, err := q.UpdatePendingFlowTemplateRequest(ctx, UpdatePendingFlowTemplateRequestParams{
		ID: req.ID, RequesterID: alice, Revision: req.Revision, Title: "t", Text: "t", TargetTypes: []TargetType{TargetTypeGeneral},
	}); !errors.Is(err, sql.ErrNoRows) {
		t.Fatalf("edit withdrawn: want ErrNoRows, got %v", err)
	}

	rejected := submitCreateRequest(t, q, alice, "To reject")
	if _, err := q.RejectFlowTemplateRequest(ctx, RejectFlowTemplateRequestParams{
		ID: rejected.ID, Revision: rejected.Revision, ReviewNote: "too broad", ReviewerID: admin,
	}); err != nil {
		t.Fatalf("reject: %v", err)
	}

	count, err := q.CountPendingFlowTemplateRequestsByRequester(ctx, alice)
	if err != nil || count != 0 {
		t.Fatalf("pending count: %d, %v", count, err)
	}
}

func TestDeletingAuthorKeepsSharedTemplate(t *testing.T) {
	ctx := context.Background()
	db, q := openTemplateTestDB(t)
	alice := createTemplateTestUser(t, db, "alice")

	template, err := q.CreateFlowTemplate(ctx, CreateFlowTemplateParams{
		UserID: alice, Title: "Shared", Text: "shared", TargetTypes: []TargetType{TargetTypeGeneral},
	})
	if err != nil {
		t.Fatalf("create template: %v", err)
	}
	t.Cleanup(func() { db.Exec(`DELETE FROM flow_templates WHERE id = $1`, template.ID) })

	if _, err := db.Exec(`DELETE FROM users WHERE id = $1`, alice); err != nil {
		t.Fatalf("delete author: %v", err)
	}

	kept, err := q.GetFlowTemplate(ctx, template.ID)
	if err != nil {
		t.Fatalf("template should survive its author: %v", err)
	}
	if kept.UserID.Valid {
		t.Fatalf("author should be cleared, got %v", kept.UserID)
	}
}

// An admin edit that commits while an approval waits on the template row lock
// must make the approval a no-op, not overwrite the edit or leave the request
// marked approved without its content applied.
func TestApproveUpdateLosesRaceToConcurrentEdit(t *testing.T) {
	ctx := context.Background()
	db, q := openTemplateTestDB(t)
	admin := adminTestUserID(t, db)
	alice := createTemplateTestUser(t, db, "alice")

	template, err := q.CreateFlowTemplate(ctx, CreateFlowTemplateParams{
		UserID: alice, Title: "Original", Text: "original", TargetTypes: []TargetType{TargetTypeGeneral},
	})
	if err != nil {
		t.Fatalf("create template: %v", err)
	}
	t.Cleanup(func() { db.Exec(`DELETE FROM flow_templates WHERE id = $1`, template.ID) })

	edit, err := q.CreateFlowTemplateRequest(ctx, CreateFlowTemplateRequestParams{
		Kind:        TemplateRequestKindUpdate,
		TemplateID:  sql.NullInt64{Int64: template.ID, Valid: true},
		RequesterID: alice,
		Title:       "Proposed",
		Text:        "proposed",
		TargetTypes: []TargetType{TargetTypeGeneral},
	})
	if err != nil {
		t.Fatalf("create edit request: %v", err)
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		t.Fatalf("begin: %v", err)
	}
	if _, err := New(db).WithTx(tx).UpdateFlowTemplate(ctx, UpdateFlowTemplateParams{
		ID: template.ID, Title: "Admin edit", Text: "admin", TargetTypes: []TargetType{TargetTypeGeneral},
	}); err != nil {
		tx.Rollback()
		t.Fatalf("admin edit: %v", err)
	}

	done := make(chan error, 1)
	go func() {
		_, err := q.ApproveUpdateFlowTemplateRequest(ctx, ApproveUpdateFlowTemplateRequestParams{
			ID: edit.ID, Revision: edit.Revision, TemplateVersion: template.Version, ReviewerID: admin,
		})
		done <- err
	}()

	// Give the approval time to block on the row lock, then let the edit win.
	if _, err := db.ExecContext(ctx, `SELECT pg_sleep(0.3)`); err != nil {
		t.Fatalf("sleep: %v", err)
	}
	if err := tx.Commit(); err != nil {
		t.Fatalf("commit: %v", err)
	}

	if err := <-done; !errors.Is(err, sql.ErrNoRows) {
		t.Fatalf("approval racing an edit: want ErrNoRows, got %v", err)
	}

	live, err := q.GetFlowTemplate(ctx, template.ID)
	if err != nil {
		t.Fatalf("reload template: %v", err)
	}
	if live.Title != "Admin edit" || live.Version != 2 {
		t.Fatalf("admin edit must survive: %+v", live)
	}
	if view, _ := q.GetFlowTemplateRequest(ctx, edit.ID); view.Status != TemplateRequestStatusPending {
		t.Fatalf("request must stay pending, got %s", view.Status)
	}
}
