-- Template requests: a user's proposed new template or edit to their own
-- template, waiting for admin review. Every state transition is a single
-- conditional statement (status/revision/version guards in the WHERE clause),
-- so concurrent reviewers or a requester editing mid-review can never apply a
-- decision to content the reviewer did not see.

-- name: GetFlowTemplateRequest :one
SELECT * FROM flow_template_requests_view
WHERE id = $1 LIMIT 1;

-- name: GetFlowTemplateRequests :many
SELECT * FROM flow_template_requests_view
ORDER BY (status = 'pending') DESC, updated_at DESC;

-- name: GetFlowTemplateRequestsByRequester :many
SELECT * FROM flow_template_requests_view
WHERE requester_id = $1
ORDER BY (status = 'pending') DESC, updated_at DESC;

-- name: GetPendingFlowTemplateRequestByTemplate :one
SELECT * FROM flow_template_requests_view
WHERE template_id = $1 AND status = 'pending' LIMIT 1;

-- name: CountPendingFlowTemplateRequestsByRequester :one
SELECT COUNT(*)::BIGINT FROM flow_template_requests
WHERE requester_id = $1 AND status = 'pending';

-- name: CreateFlowTemplateRequest :one
INSERT INTO flow_template_requests (
  kind,
  template_id,
  requester_id,
  title,
  text,
  target_types,
  base_version
) VALUES (
  $1,
  $2,
  $3,
  $4,
  $5,
  $6,
  $7
)
RETURNING *;

-- name: UpdatePendingFlowTemplateRequest :one
UPDATE flow_template_requests
SET
  title = $4,
  text = $5,
  target_types = $6,
  base_version = $7,
  revision = revision + 1
WHERE id = $1 AND requester_id = $2 AND revision = $3 AND status = 'pending'
RETURNING *;

-- name: WithdrawFlowTemplateRequest :one
UPDATE flow_template_requests
SET status = 'withdrawn'
WHERE id = $1 AND requester_id = $2 AND status = 'pending'
RETURNING *;

-- name: RejectFlowTemplateRequest :one
UPDATE flow_template_requests
SET
  status = 'rejected',
  review_note = sqlc.arg(review_note)::TEXT,
  reviewed_by = sqlc.arg(reviewer_id)::BIGINT,
  reviewed_at = CURRENT_TIMESTAMP
WHERE id = sqlc.arg(id) AND revision = sqlc.arg(revision) AND status = 'pending'
RETURNING *;

-- Approving a new template: mark the request approved and publish the
-- template atomically. The template id is drawn up front so the request can
-- link to the template it produced within the same statement.
-- name: ApproveCreateFlowTemplateRequest :one
WITH new_template AS (
  SELECT nextval(pg_get_serial_sequence('flow_templates', 'id')) AS id
), approved AS (
  UPDATE flow_template_requests
  SET
    status = 'approved',
    template_id = (SELECT new_template.id FROM new_template),
    review_note = sqlc.narg(review_note),
    reviewed_by = sqlc.arg(reviewer_id)::BIGINT,
    reviewed_at = CURRENT_TIMESTAMP
  WHERE flow_template_requests.id = sqlc.arg(id)
    AND kind = 'create'
    AND revision = sqlc.arg(revision)
    AND status = 'pending'
  RETURNING *
)
INSERT INTO flow_templates (id, user_id, title, text, target_types)
OVERRIDING SYSTEM VALUE
SELECT approved.template_id, approved.requester_id, approved.title, approved.text, approved.target_types
FROM approved
RETURNING *;

-- Approving an edit: the template is written first, guarded on its version
-- (re-checked by Postgres after any row-lock wait), and the request is marked
-- approved only if that write happened. A concurrent admin edit, archive,
-- requester edit or second reviewer therefore makes this a no-op, never a
-- half-applied approval.
-- name: ApproveUpdateFlowTemplateRequest :one
WITH req AS (
  SELECT r.id, r.template_id, r.title, r.text, r.target_types
  FROM flow_template_requests r
  WHERE r.id = sqlc.arg(id)
    AND r.kind = 'update'
    AND r.revision = sqlc.arg(revision)
    AND r.status = 'pending'
  FOR UPDATE
), updated AS (
  UPDATE flow_templates
  SET
    title = req.title,
    text = req.text,
    target_types = req.target_types,
    version = flow_templates.version + 1
  FROM req
  WHERE flow_templates.id = req.template_id
    AND flow_templates.archived_at IS NULL
    AND flow_templates.version = sqlc.arg(template_version)
  RETURNING flow_templates.*
), approved AS (
  UPDATE flow_template_requests
  SET
    status = 'approved',
    review_note = sqlc.narg(review_note),
    reviewed_by = sqlc.arg(reviewer_id)::BIGINT,
    reviewed_at = CURRENT_TIMESTAMP
  WHERE flow_template_requests.id = sqlc.arg(id)
    AND EXISTS (SELECT 1 FROM updated)
  RETURNING flow_template_requests.id
)
SELECT
  updated.id, updated.user_id, updated.title, updated.text, updated.created_at, updated.updated_at,
  updated.target_types, updated.system_owned, updated.version, updated.archived_at
FROM updated;
