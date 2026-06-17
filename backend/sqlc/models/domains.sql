-- name: CreateDomain :one
INSERT INTO domains (
  user_id, name, target_type, status, detection_metadata
) VALUES (
  $1, $2, $3, $4, $5
)
RETURNING *;

-- name: GetDomain :one
SELECT * FROM domains
WHERE id = $1 AND deleted_at IS NULL;

-- name: GetUserDomain :one
SELECT * FROM domains
WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;

-- name: GetDomains :many
SELECT * FROM domains
WHERE deleted_at IS NULL
ORDER BY created_at DESC;

-- name: GetUserDomains :many
SELECT * FROM domains
WHERE user_id = $1 AND deleted_at IS NULL
ORDER BY created_at DESC;

-- name: UpdateDomainStatus :one
UPDATE domains
SET status = $2, updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;

-- name: UpdateDomainDetectionMetadata :one
UPDATE domains
SET target_type = $2, detection_metadata = $3, updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;

-- name: DeleteDomain :one
UPDATE domains
SET deleted_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;

-- name: CountActiveDomainsForUser :one
SELECT COUNT(*)::bigint
FROM domains
WHERE user_id = $1
  AND deleted_at IS NULL
  AND status IN ('created', 'classifying', 'running');
