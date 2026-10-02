package graph

import (
	"encoding/json"
	"strings"
	"testing"

	"pentagi/pkg/graph/model"
)

func mustJSON(t *testing.T, v any) string {
	t.Helper()
	b, err := json.Marshal(v)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	return string(b)
}

func validGCPServiceAccount(t *testing.T) string {
	return mustJSON(t, map[string]any{
		"type":         "service_account",
		"private_key":  "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n",
		"client_email": "svc@proj.iam.gserviceaccount.com",
	})
}

func TestValidateScanCredential(t *testing.T) {
	const validSecret = "abcdefghijklmnopqrstuvwxyz0123456789ABCD" // 40 chars
	const validGUID = "00000000-0000-0000-0000-000000000000"

	tests := []struct {
		name    string
		kind    model.ScanCredentialKind
		value   string
		wantErr bool
	}{
		{
			name:  "aws valid",
			kind:  model.ScanCredentialKindCloudKeys,
			value: mustJSON(t, map[string]string{"provider": "aws", "access_key_id": "AKIAIOSFODNN7EXAMPLE", "secret_access_key": validSecret, "region": "us-east-1"}),
		},
		{
			name:    "aws bad access key",
			kind:    model.ScanCredentialKindCloudKeys,
			value:   mustJSON(t, map[string]string{"provider": "aws", "access_key_id": "nope", "secret_access_key": validSecret}),
			wantErr: true,
		},
		{
			name:    "aws short secret",
			kind:    model.ScanCredentialKindCloudKeys,
			value:   mustJSON(t, map[string]string{"provider": "aws", "access_key_id": "AKIAIOSFODNN7EXAMPLE", "secret_access_key": "short"}),
			wantErr: true,
		},
		{
			name:    "aws bad region",
			kind:    model.ScanCredentialKindCloudKeys,
			value:   mustJSON(t, map[string]string{"provider": "aws", "access_key_id": "AKIAIOSFODNN7EXAMPLE", "secret_access_key": validSecret, "region": "US_EAST"}),
			wantErr: true,
		},
		{
			name:  "gcp valid",
			kind:  model.ScanCredentialKindCloudKeys,
			value: mustJSON(t, map[string]string{"provider": "gcp", "service_account_json": validGCPServiceAccount(t)}),
		},
		{
			name:    "gcp not json",
			kind:    model.ScanCredentialKindCloudKeys,
			value:   mustJSON(t, map[string]string{"provider": "gcp", "service_account_json": "not json"}),
			wantErr: true,
		},
		{
			name:    "gcp missing client_email",
			kind:    model.ScanCredentialKindCloudKeys,
			value:   mustJSON(t, map[string]string{"provider": "gcp", "service_account_json": mustJSON(t, map[string]string{"type": "service_account", "private_key": "x"})}),
			wantErr: true,
		},
		{
			name:  "azure valid",
			kind:  model.ScanCredentialKindCloudKeys,
			value: mustJSON(t, map[string]string{"provider": "azure", "tenant": validGUID, "app_id": validGUID, "client_secret": "super-secret-value"}),
		},
		{
			name:    "azure bad guid",
			kind:    model.ScanCredentialKindCloudKeys,
			value:   mustJSON(t, map[string]string{"provider": "azure", "tenant": "bad", "app_id": validGUID, "client_secret": "super-secret-value"}),
			wantErr: true,
		},
		{
			name:    "azure short secret",
			kind:    model.ScanCredentialKindCloudKeys,
			value:   mustJSON(t, map[string]string{"provider": "azure", "tenant": validGUID, "app_id": validGUID, "client_secret": "x"}),
			wantErr: true,
		},
		{
			name:    "unknown provider",
			kind:    model.ScanCredentialKindCloudKeys,
			value:   mustJSON(t, map[string]string{"provider": "oracle"}),
			wantErr: true,
		},
		{
			name:  "web token valid",
			kind:  model.ScanCredentialKindWebToken,
			value: mustJSON(t, map[string]string{"protected_url": "https://app.acme.com/api/me", "token": "abc123"}),
		},
		{
			name:    "web token bad url",
			kind:    model.ScanCredentialKindWebToken,
			value:   mustJSON(t, map[string]string{"protected_url": "acme.com", "token": "abc123"}),
			wantErr: true,
		},
		{
			name:    "web token missing token",
			kind:    model.ScanCredentialKindWebToken,
			value:   mustJSON(t, map[string]string{"protected_url": "https://app.acme.com/api/me", "token": ""}),
			wantErr: true,
		},
		{
			name:    "web token dotless host",
			kind:    model.ScanCredentialKindWebToken,
			value:   mustJSON(t, map[string]string{"protected_url": "https://foo", "token": "abc123"}),
			wantErr: true,
		},
		{
			name:  "web token ip host",
			kind:  model.ScanCredentialKindWebToken,
			value: mustJSON(t, map[string]string{"protected_url": "http://10.0.0.1:8080/me", "token": "abc123"}),
		},
		{
			name:  "email password valid",
			kind:  model.ScanCredentialKindEmailPassword,
			value: mustJSON(t, map[string]string{"login_url": "https://app.acme.com/login", "email": "tester@acme.com", "password": "hunter2"}),
		},
		{
			name:    "email password bad url",
			kind:    model.ScanCredentialKindEmailPassword,
			value:   mustJSON(t, map[string]string{"login_url": "ftp://x", "email": "tester@acme.com", "password": "hunter2"}),
			wantErr: true,
		},
		{
			name:    "email password missing password",
			kind:    model.ScanCredentialKindEmailPassword,
			value:   mustJSON(t, map[string]string{"login_url": "https://app.acme.com/login", "email": "tester@acme.com", "password": ""}),
			wantErr: true,
		},
		{
			name:    "empty value",
			kind:    model.ScanCredentialKindCloudKeys,
			value:   "   ",
			wantErr: true,
		},
		{
			name:    "unknown kind",
			kind:    model.ScanCredentialKind("nonsense"),
			value:   "{}",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateScanCredential(tt.kind, tt.value)
			if tt.wantErr && err == nil {
				t.Fatalf("expected error, got nil")
			}
			if !tt.wantErr && err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
		})
	}
}

func TestValidateScanCredentialErrorMentionsField(t *testing.T) {
	err := validateScanCredential(
		model.ScanCredentialKindCloudKeys,
		mustJSON(t, map[string]string{"provider": "gcp", "service_account_json": mustJSON(t, map[string]string{"type": "service_account", "private_key": "x"})}),
	)
	if err == nil || !strings.Contains(err.Error(), "client_email") {
		t.Fatalf("expected client_email error, got %v", err)
	}
}
