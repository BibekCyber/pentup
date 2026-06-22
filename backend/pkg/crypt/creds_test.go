package crypt

import (
	"strings"
	"testing"
)

const testSalt = "a-strong-random-cookie-signing-salt-value"

func TestEncryptDecryptRoundTrip(t *testing.T) {
	cases := []string{
		"hunter2",
		"AKIAIOSFODNN7EXAMPLE",
		`{"type":"service_account","project_id":"acme","private_key":"-----BEGIN..."}`,
		"unicode: 日本語 — émojî 🔑",
		strings.Repeat("x", 4096),
	}

	for _, plaintext := range cases {
		enc, err := EncryptCredential(testSalt, plaintext)
		if err != nil {
			t.Fatalf("encrypt(%q): %v", plaintext, err)
		}

		if enc == plaintext {
			t.Fatalf("ciphertext equals plaintext for %q", plaintext)
		}

		dec, err := DecryptCredential(testSalt, enc)
		if err != nil {
			t.Fatalf("decrypt: %v", err)
		}

		if dec != plaintext {
			t.Fatalf("round-trip mismatch: got %q want %q", dec, plaintext)
		}
	}
}

func TestEncryptUsesRandomNonce(t *testing.T) {
	a, err := EncryptCredential(testSalt, "same-secret")
	if err != nil {
		t.Fatal(err)
	}

	b, err := EncryptCredential(testSalt, "same-secret")
	if err != nil {
		t.Fatal(err)
	}

	if a == b {
		t.Fatal("expected different ciphertexts for the same plaintext (random nonce)")
	}

	// Both must still decrypt to the same value.
	for _, enc := range []string{a, b} {
		dec, err := DecryptCredential(testSalt, enc)
		if err != nil || dec != "same-secret" {
			t.Fatalf("decrypt failed: dec=%q err=%v", dec, err)
		}
	}
}

func TestDecryptWrongSaltFails(t *testing.T) {
	enc, err := EncryptCredential(testSalt, "secret")
	if err != nil {
		t.Fatal(err)
	}

	if _, err := DecryptCredential("a-different-but-valid-salt-value", enc); err == nil {
		t.Fatal("expected decryption under a different salt to fail (authenticated)")
	}
}

func TestDecryptTamperedFails(t *testing.T) {
	enc, err := EncryptCredential(testSalt, "secret")
	if err != nil {
		t.Fatal(err)
	}

	// Flip a character in the middle of the base64 to corrupt ciphertext/tag.
	b := []byte(enc)
	mid := len(b) / 2
	if b[mid] == 'A' {
		b[mid] = 'B'
	} else {
		b[mid] = 'A'
	}

	if _, err := DecryptCredential(testSalt, string(b)); err == nil {
		t.Fatal("expected tampered ciphertext to fail GCM authentication")
	}
}

func TestInsecureSaltRefused(t *testing.T) {
	for _, bad := range []string{"", "salt", "   ", "  salt  "} {
		if !IsInsecureSalt(bad) {
			t.Fatalf("expected %q to be flagged insecure", bad)
		}

		if _, err := EncryptCredential(bad, "secret"); err != ErrInsecureSalt {
			t.Fatalf("encrypt with insecure salt %q: got %v want ErrInsecureSalt", bad, err)
		}

		if _, err := DecryptCredential(bad, "anything"); err != ErrInsecureSalt {
			t.Fatalf("decrypt with insecure salt %q: got %v want ErrInsecureSalt", bad, err)
		}
	}
}

func TestDecryptGarbageFails(t *testing.T) {
	if _, err := DecryptCredential(testSalt, "not-valid-base64!!!"); err == nil {
		t.Fatal("expected non-base64 input to fail")
	}

	if _, err := DecryptCredential(testSalt, "c2hvcnQ="); err == nil {
		t.Fatal("expected too-short ciphertext to fail")
	}
}
