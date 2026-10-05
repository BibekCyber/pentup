-- name: GetProviders :many
-- Providers are shared by all users; user_id only records the admin who
-- created the row, so no query here is scoped to a user.
SELECT
  p.*
FROM providers p
WHERE p.deleted_at IS NULL
ORDER BY p.created_at ASC;

-- name: GetProvidersByType :many
SELECT
  p.*
FROM providers p
WHERE p.type = $1 AND p.deleted_at IS NULL
ORDER BY p.created_at ASC;

-- name: GetProvider :one
SELECT
  p.*
FROM providers p
WHERE p.id = $1 AND p.deleted_at IS NULL;

-- name: GetProviderByName :one
SELECT
  p.*
FROM providers p
WHERE p.name = $1 AND p.deleted_at IS NULL;

-- name: CreateProvider :one
INSERT INTO providers (
  user_id,
  type,
  name,
  config
) VALUES (
  $1, $2, $3, $4
)
RETURNING *;

-- name: UpdateProvider :one
UPDATE providers
SET config = $2, name = $3
WHERE id = $1 AND deleted_at IS NULL
RETURNING *;

-- name: DeleteProvider :one
UPDATE providers
SET deleted_at = CURRENT_TIMESTAMP, is_default = false
WHERE id = $1 AND deleted_at IS NULL
RETURNING *;

-- name: SetDefaultProvider :one
UPDATE providers SET is_default = true
WHERE id = $1 AND deleted_at IS NULL
RETURNING *;

-- name: ClearDefaultProviders :exec
UPDATE providers SET is_default = false
WHERE is_default = true AND deleted_at IS NULL;

-- name: GetDefaultProvider :one
SELECT * FROM providers
WHERE is_default = true AND deleted_at IS NULL
LIMIT 1;
