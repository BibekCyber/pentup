-- Templates form one shared library: every live (non-archived) template is
-- visible to every user. Only reviewed content is ever stored here; proposed
-- content lives in flow_template_requests until an admin approves it.

-- name: GetFlowTemplate :one
SELECT * FROM flow_templates
WHERE id = $1 AND archived_at IS NULL LIMIT 1;

-- name: GetFlowTemplates :many
SELECT * FROM flow_templates
WHERE archived_at IS NULL
ORDER BY system_owned DESC, created_at DESC;

-- name: GetFlowTemplatesByTargetType :many
SELECT * FROM flow_templates
WHERE archived_at IS NULL
  AND sqlc.arg(target_type)::TARGET_TYPE = ANY(target_types)
ORDER BY system_owned DESC, created_at DESC;

-- Auto-detect only spawns the platform templates plus the caller's own, so a
-- template another user published never runs on someone's scan unselected.
-- name: GetDefaultFlowTemplatesByTargetType :many
SELECT * FROM flow_templates
WHERE archived_at IS NULL
  AND (user_id = sqlc.arg(user_id)::BIGINT OR system_owned = true)
  AND sqlc.arg(target_type)::TARGET_TYPE = ANY(target_types)
ORDER BY system_owned DESC, created_at DESC;

-- name: CreateFlowTemplate :one
INSERT INTO flow_templates (
  user_id,
  title,
  text,
  target_types
) VALUES (
  sqlc.arg(user_id)::BIGINT,
  sqlc.arg(title),
  sqlc.arg(text),
  sqlc.arg(target_types)
)
RETURNING *;

-- expected_version is optional: when given, the write only applies if nobody
-- changed the template since the editor loaded it.
-- name: UpdateFlowTemplate :one
UPDATE flow_templates
SET
  title = sqlc.arg(title),
  text = sqlc.arg(text),
  target_types = sqlc.arg(target_types),
  version = version + 1
WHERE id = sqlc.arg(id)
  AND archived_at IS NULL
  AND (sqlc.narg(expected_version)::INTEGER IS NULL OR version = sqlc.narg(expected_version)::INTEGER)
RETURNING *;

-- name: UpdateFlowTemplateTargetTypes :one
UPDATE flow_templates
SET
  target_types = $2,
  version = version + 1
WHERE id = $1 AND archived_at IS NULL
RETURNING *;

-- Archiving also closes the template's open edit request in the same
-- statement, so no pending edit can outlive (or be approved onto) it.
-- name: ArchiveFlowTemplate :one
WITH archived AS (
  UPDATE flow_templates
  SET archived_at = CURRENT_TIMESTAMP
  WHERE flow_templates.id = sqlc.arg(id) AND archived_at IS NULL
  RETURNING *
), closed AS (
  UPDATE flow_template_requests
  SET
    status = 'closed',
    review_note = 'The template was deleted by an administrator.',
    reviewed_by = sqlc.arg(reviewer_id)::BIGINT,
    reviewed_at = CURRENT_TIMESTAMP
  WHERE template_id IN (SELECT archived.id FROM archived) AND status = 'pending'
  RETURNING flow_template_requests.id
)
SELECT
  archived.id, archived.user_id, archived.title, archived.text, archived.created_at, archived.updated_at,
  archived.target_types, archived.system_owned, archived.version, archived.archived_at,
  COALESCE((SELECT closed.id FROM closed LIMIT 1), 0)::BIGINT AS closed_request_id
FROM archived;
