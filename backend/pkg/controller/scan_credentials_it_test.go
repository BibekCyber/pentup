package controller

import (
	"context"
	"database/sql"
	"os"
	"testing"

	"pentagi/pkg/crypt"
	"pentagi/pkg/database"

	_ "github.com/lib/pq"
)

// Opt-in integration test for the scan-credential round-trip against a real
// Postgres: encrypt -> store (ciphertext only) -> fetch -> decrypt. Skipped
// unless RUN_SCAN_CRED_IT is set. Run with:
//
//	RUN_SCAN_CRED_IT=1 \
//	DATABASE_URL='postgres://postgres:postgres@localhost:5432/pentagidb?sslmode=disable' \
//	go test ./pkg/controller/ -run TestScanCredentialRoundTrip -v
func TestScanCredentialRoundTrip(t *testing.T) {
	if os.Getenv("RUN_SCAN_CRED_IT") == "" {
		t.Skip("set RUN_SCAN_CRED_IT=1 (and DATABASE_URL) to run this integration test")
	}

	url := os.Getenv("DATABASE_URL")
	if url == "" {
		t.Skip("DATABASE_URL not set")
	}

	db, err := sql.Open("postgres", url)
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer db.Close()

	q := database.New(db)
	ctx := context.Background()

	var userID int64
	if err := db.QueryRowContext(ctx, "SELECT id FROM users ORDER BY id LIMIT 1").Scan(&userID); err != nil {
		t.Fatalf("pick a user: %v", err)
	}

	domain, err := q.CreateDomain(ctx, database.CreateDomainParams{
		UserID:            userID,
		Name:              "scan-cred-it.example",
		TargetType:        database.TargetType("web_app"),
		Status:            database.DomainStatusCreated,
		DetectionMetadata: []byte("{}"),
	})
	if err != nil {
		t.Fatalf("create throwaway domain: %v", err)
	}
	defer func() {
		_ = q.DeleteScanCredentialsForDomain(ctx, domain.ID)
		_, _ = q.DeleteDomain(ctx, domain.ID)
	}()

	// Exercise SetDomainScopeBox too (grey-box web engagement).
	if err := q.SetDomainScopeBox(ctx, database.SetDomainScopeBoxParams{
		ID:  domain.ID,
		Box: sql.NullString{String: "grey", Valid: true},
	}); err != nil {
		t.Fatalf("set scope/box: %v", err)
	}

	const salt = "a-strong-test-salt-value-not-default"
	const secret = `{"email":"tester@acme.com","password":"S3cr3t!passXYZ"}`

	ciphertext, err := crypt.EncryptCredential(salt, secret)
	if err != nil {
		t.Fatalf("encrypt: %v", err)
	}
	if ciphertext == secret {
		t.Fatal("ciphertext must differ from plaintext")
	}

	if _, err := q.CreateScanCredential(ctx, database.CreateScanCredentialParams{
		UserID:     userID,
		DomainID:   domain.ID,
		Kind:       "email_password",
		Ciphertext: ciphertext,
	}); err != nil {
		t.Fatalf("create scan credential: %v", err)
	}

	got, err := q.GetActiveScanCredentialForDomain(ctx, domain.ID)
	if err != nil {
		t.Fatalf("get scan credential: %v", err)
	}
	if got.Kind != "email_password" {
		t.Fatalf("kind: got %q want email_password", got.Kind)
	}
	// What is persisted must be ciphertext, never the plaintext secret.
	if got.Ciphertext == secret {
		t.Fatal("stored credential is plaintext — encryption-at-rest failed")
	}

	decrypted, err := crypt.DecryptCredential(salt, got.Ciphertext)
	if err != nil {
		t.Fatalf("decrypt: %v", err)
	}
	if decrypted != secret {
		t.Fatalf("round-trip mismatch: got %q want %q", decrypted, secret)
	}

	// Soft-delete removes it from the active fetch.
	if err := q.DeleteScanCredentialsForDomain(ctx, domain.ID); err != nil {
		t.Fatalf("delete scan credentials: %v", err)
	}
	if _, err := q.GetActiveScanCredentialForDomain(ctx, domain.ID); err != sql.ErrNoRows {
		t.Fatalf("expected sql.ErrNoRows after soft-delete, got %v", err)
	}
}
