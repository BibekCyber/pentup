package graph

import (
	"encoding/json"
	"fmt"
	"net/url"
	"regexp"
	"strings"

	"pentagi/pkg/graph/model"
)

// Server-side credential format checks. These mirror the scan wizard's client
// validation (frontend/src/lib/credential-validation.ts) so a bypassed or
// hand-crafted request cannot persist a malformed credential. The client can be
// skipped; this is the real gate.
var (
	awsAccessKeyRe = regexp.MustCompile(`^(AKIA|ASIA)[0-9A-Z]{16}$`)
	awsSecretRe    = regexp.MustCompile(`^[A-Za-z0-9/+=]{40}$`)
	awsRegionRe    = regexp.MustCompile(`^[a-z]{2}-[a-z]+-\d$`)
	guidRe         = regexp.MustCompile(`(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)
)

// validateScanCredential asserts that a scan credential's JSON value has the
// correct shape and per-field format for its kind, returning a clear error on
// malformed input.
func validateScanCredential(kind model.ScanCredentialKind, value string) error {
	if strings.TrimSpace(value) == "" {
		return fmt.Errorf("credential value is empty")
	}

	switch kind {
	case model.ScanCredentialKindCloudKeys:
		return validateCloudKeysCredential(value)
	case model.ScanCredentialKindWebToken:
		return validateWebTokenCredential(value)
	case model.ScanCredentialKindEmailPassword:
		return validateEmailPasswordCredential(value)
	default:
		return fmt.Errorf("unsupported credential kind: %s", kind)
	}
}

func validateCloudKeysCredential(value string) error {
	var c struct {
		AccessKeyID        string `json:"access_key_id"`
		AppID              string `json:"app_id"`
		ClientSecret       string `json:"client_secret"`
		Provider           string `json:"provider"`
		Region             string `json:"region"`
		SecretAccessKey    string `json:"secret_access_key"`
		ServiceAccountJSON string `json:"service_account_json"`
		Tenant             string `json:"tenant"`
	}
	if err := json.Unmarshal([]byte(value), &c); err != nil {
		return fmt.Errorf("invalid cloud credential JSON: %w", err)
	}

	switch c.Provider {
	case "aws":
		if !awsAccessKeyRe.MatchString(strings.TrimSpace(c.AccessKeyID)) {
			return fmt.Errorf("invalid AWS access key id")
		}
		if !awsSecretRe.MatchString(strings.TrimSpace(c.SecretAccessKey)) {
			return fmt.Errorf("invalid AWS secret access key")
		}
		// Region is optional; validate its format only when supplied.
		if region := strings.TrimSpace(c.Region); region != "" && !awsRegionRe.MatchString(region) {
			return fmt.Errorf("invalid AWS region")
		}
		return nil
	case "gcp":
		return validateGCPServiceAccount(c.ServiceAccountJSON)
	case "azure":
		if !guidRe.MatchString(strings.TrimSpace(c.Tenant)) {
			return fmt.Errorf("invalid Azure tenant id (expected a GUID)")
		}
		if !guidRe.MatchString(strings.TrimSpace(c.AppID)) {
			return fmt.Errorf("invalid Azure application id (expected a GUID)")
		}
		if len(strings.TrimSpace(c.ClientSecret)) < 8 {
			return fmt.Errorf("invalid Azure client secret")
		}
		return nil
	default:
		return fmt.Errorf("unsupported cloud provider: %q", c.Provider)
	}
}

func validateGCPServiceAccount(raw string) error {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return fmt.Errorf("missing GCP service account JSON")
	}

	var sa struct {
		ClientEmail string `json:"client_email"`
		PrivateKey  string `json:"private_key"`
		Type        string `json:"type"`
	}
	if err := json.Unmarshal([]byte(raw), &sa); err != nil {
		return fmt.Errorf("invalid GCP service account JSON: %w", err)
	}
	if sa.Type != "service_account" {
		return fmt.Errorf("GCP service account JSON must have type=service_account")
	}
	if sa.PrivateKey == "" {
		return fmt.Errorf("GCP service account JSON is missing private_key")
	}
	if sa.ClientEmail == "" {
		return fmt.Errorf("GCP service account JSON is missing client_email")
	}
	return nil
}

func validateWebTokenCredential(value string) error {
	var c struct {
		ProtectedURL string `json:"protected_url"`
		Token        string `json:"token"`
	}
	if err := json.Unmarshal([]byte(value), &c); err != nil {
		return fmt.Errorf("invalid web token credential JSON: %w", err)
	}
	if strings.TrimSpace(c.Token) == "" {
		return fmt.Errorf("missing token")
	}
	if err := validateHTTPURL(c.ProtectedURL); err != nil {
		return fmt.Errorf("invalid protected URL: %w", err)
	}
	return nil
}

func validateEmailPasswordCredential(value string) error {
	var c struct {
		Email    string `json:"email"`
		LoginURL string `json:"login_url"`
		Password string `json:"password"`
	}
	if err := json.Unmarshal([]byte(value), &c); err != nil {
		return fmt.Errorf("invalid login credential JSON: %w", err)
	}
	if err := validateHTTPURL(c.LoginURL); err != nil {
		return fmt.Errorf("invalid login URL: %w", err)
	}
	if strings.TrimSpace(c.Email) == "" {
		return fmt.Errorf("missing email or username")
	}
	if c.Password == "" {
		return fmt.Errorf("missing password")
	}
	return nil
}

func validateHTTPURL(raw string) error {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return fmt.Errorf("empty URL")
	}

	u, err := url.Parse(raw)
	if err != nil {
		return err
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return fmt.Errorf("must be an absolute http(s) URL")
	}

	// Require a real dotted host (app.acme.com or 10.0.0.1); a bare hostname
	// with no dot such as "https://foo" is not a usable target.
	host := u.Hostname()
	if host == "" {
		return fmt.Errorf("missing host")
	}
	if !strings.Contains(host, ".") || strings.HasPrefix(host, ".") || strings.HasSuffix(host, ".") || strings.Contains(host, "..") {
		return fmt.Errorf("host must be a domain or IP (e.g. app.acme.com)")
	}
	return nil
}
