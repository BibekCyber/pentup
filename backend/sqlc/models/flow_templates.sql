-- name: GetFlowTemplate :one
SELECT * FROM flow_templates
WHERE id = $1 AND (user_id = $2 OR system_owned = true) LIMIT 1;

-- name: GetFlowTemplatesByUserID :many
SELECT * FROM flow_templates
WHERE user_id = $1 OR system_owned = true
ORDER BY system_owned DESC, created_at DESC;

-- name: GetFlowTemplatesByTargetType :many
SELECT * FROM flow_templates
WHERE (user_id = $1 OR system_owned = true)
  AND $2::TARGET_TYPE = ANY(target_types)
ORDER BY system_owned DESC, created_at DESC;

-- name: GetDefaultFlowTemplatesByTargetType :many
SELECT * FROM flow_templates
WHERE (user_id = $1 OR system_owned = true)
  AND $2::TARGET_TYPE = ANY(target_types)
ORDER BY system_owned DESC, created_at DESC;

-- name: CreateFlowTemplate :one
INSERT INTO flow_templates (
  user_id,
  title,
  text,
  target_types
) VALUES (
  $1,
  $2,
  $3,
  $4
)
RETURNING *;

-- name: UpdateFlowTemplate :one
UPDATE flow_templates
SET
  title = $3,
  text = $4
WHERE id = $1 AND user_id = $2
RETURNING *;

-- name: UpdateFlowTemplateTargetTypes :one
UPDATE flow_templates
SET
  target_types = $2
WHERE id = $1
RETURNING *;

-- name: DeleteFlowTemplate :exec
DELETE FROM flow_templates
WHERE id = $1 AND user_id = $2;
