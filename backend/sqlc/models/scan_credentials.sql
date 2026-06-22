-- name: CreateScanCredential :one
-- ciphertext must already be AES-256-GCM encrypted by pkg/crypt before insert;
-- the plaintext credential must NEVER be passed here.
INSERT INTO scan_credentials (
  user_id, domain_id, kind, ciphertext
) VALUES (
  $1, $2, $3, $4
)
RETURNING *;

-- name: GetActiveScanCredentialForDomain :one
SELECT * FROM scan_credentials
WHERE domain_id = $1 AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 1;

-- name: DeleteScanCredentialsForDomain :exec
UPDATE scan_credentials
SET deleted_at = CURRENT_TIMESTAMP
WHERE domain_id = $1 AND deleted_at IS NULL;
