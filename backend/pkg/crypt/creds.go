// Package crypt provides reversible, authenticated encryption for sensitive
// values that must be read back later (e.g. target credentials handed to an
// agent at scan time). It mirrors the PBKDF2 key-derivation pattern used for
// cookie/JWT keys in pkg/server/auth/session.go, but produces a symmetric
// AES-256-GCM key instead of an HMAC/signing key.
//
// NOTE: this is for data that must be decrypted again. For one-way password
// storage use bcrypt (see pkg/server/rdb), never this package.
package crypt

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha512"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"strings"
	"sync"

	"golang.org/x/crypto/pbkdf2"
)

const (
	// pbkdf2Iterations matches pkg/server/auth/session.go (OWASP 2023).
	pbkdf2Iterations = 210000
	// credKeyLength is 256 bits for AES-256-GCM.
	credKeyLength = 32
)

// credKeys caches the derived key per global salt; PBKDF2 at 210k iterations is
// deliberately expensive, so we derive once per salt (same approach as session.go).
var credKeys sync.Map

// ErrInsecureSalt is returned when the global salt is unset or the well-known
// default sentinel, which would make the encryption key predictable. We refuse
// to encrypt under such a key rather than provide false security. This mirrors
// the default-salt guards in pkg/server/auth (api_tokens.go / auth_middleware.go).
var ErrInsecureSalt = errors.New("crypt: COOKIE_SIGNING_SALT is empty or the default sentinel; refusing to encrypt credentials under a predictable key")

// IsInsecureSalt reports whether the given global salt is unusable for credential
// encryption (empty or the default 'salt' sentinel used elsewhere in the codebase).
func IsInsecureSalt(globalSalt string) bool {
	s := strings.TrimSpace(globalSalt)
	return s == "" || s == "salt"
}

// credKey derives (and caches) the AES-256 key for a given global salt.
func credKey(globalSalt string) []byte {
	if cached, ok := credKeys.Load(globalSalt); ok {
		return cached.([]byte)
	}

	// Domain-separated password + salt so this key is independent of the
	// cookie/JWT keys derived from the same global salt.
	password := []byte(strings.Join([]string{
		"e7a1c4f0b2d94e3a8c5f6071d2b3a4c5",
		globalSalt,
		"5d4c3b2a1908f7e6d5c4b3a2918f0e7d",
	}, "|"))
	salt := []byte("pentagi.scan.creds|" + globalSalt)
	key := pbkdf2.Key(password, salt, pbkdf2Iterations, credKeyLength, sha512.New)

	actual, _ := credKeys.LoadOrStore(globalSalt, key)
	return actual.([]byte)
}

// EncryptCredential encrypts plaintext with AES-256-GCM using a key derived from
// globalSalt, and returns base64(nonce || ciphertext+tag). The nonce is random
// per call, so encrypting the same value twice yields different ciphertexts.
func EncryptCredential(globalSalt, plaintext string) (string, error) {
	if IsInsecureSalt(globalSalt) {
		return "", ErrInsecureSalt
	}

	block, err := aes.NewCipher(credKey(globalSalt))
	if err != nil {
		return "", fmt.Errorf("crypt: new cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("crypt: new gcm: %w", err)
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("crypt: read nonce: %w", err)
	}

	// Seal appends the ciphertext+tag to nonce, giving nonce||ciphertext.
	sealed := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(sealed), nil
}

// DecryptCredential reverses EncryptCredential. It fails (authenticated) if the
// data was tampered with or was encrypted under a different salt/key.
func DecryptCredential(globalSalt, encoded string) (string, error) {
	if IsInsecureSalt(globalSalt) {
		return "", ErrInsecureSalt
	}

	raw, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return "", fmt.Errorf("crypt: decode: %w", err)
	}

	block, err := aes.NewCipher(credKey(globalSalt))
	if err != nil {
		return "", fmt.Errorf("crypt: new cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("crypt: new gcm: %w", err)
	}

	nonceSize := gcm.NonceSize()
	if len(raw) < nonceSize {
		return "", errors.New("crypt: ciphertext too short")
	}

	nonce, ciphertext := raw[:nonceSize], raw[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", fmt.Errorf("crypt: open: %w", err)
	}

	return string(plaintext), nil
}
