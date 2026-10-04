-- +goose Up
-- +goose StatementBegin
-- Templates become one shared library. Non-admin users no longer write to it
-- directly: they submit new templates and edits to their own templates as
-- requests that an admin approves. templates.create / templates.edit keep
-- their names for the User role but now mean "may submit"; every direct write
-- is additionally gated on templates.admin in the resolvers (sessions cache
-- privileges, so removing them here alone would not take effect until
-- re-login). Users never delete shared templates.
DELETE FROM privileges WHERE role_id = 2 AND name = 'templates.delete';

-- A shared template is referenced by other users' scans, so deleting its
-- author must not cascade-delete it (that would also fail on flows.template_id).
ALTER TABLE flow_templates ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE flow_templates DROP CONSTRAINT IF EXISTS flow_templates_user_id_fkey;
ALTER TABLE flow_templates
  ADD CONSTRAINT flow_templates_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- version: bumped on every content change, used for optimistic concurrency
-- between admins reviewing a request and anyone editing the live template.
-- archived_at: templates are archived instead of deleted so flows that ran
-- from them keep a valid template_id.
ALTER TABLE flow_templates
  ADD COLUMN version     INTEGER     NOT NULL DEFAULT 1,
  ADD COLUMN archived_at TIMESTAMPTZ NULL;

CREATE INDEX flow_templates_live_idx ON flow_templates(created_at DESC) WHERE archived_at IS NULL;

CREATE TYPE TEMPLATE_REQUEST_KIND AS ENUM ('create', 'update');

CREATE TYPE TEMPLATE_REQUEST_STATUS AS ENUM (
  'pending',
  'approved',
  'rejected',
  'withdrawn',
  'closed'
);

-- Proposed content lives here until approved; flow_templates only ever holds
-- reviewed content, so scans can never run unreviewed text.
CREATE TABLE flow_template_requests (
  id            BIGINT                   PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  kind          TEMPLATE_REQUEST_KIND    NOT NULL,
  status        TEMPLATE_REQUEST_STATUS  NOT NULL DEFAULT 'pending',
  template_id   BIGINT                   NULL REFERENCES flow_templates(id) ON DELETE CASCADE,
  requester_id  BIGINT                   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT                     NOT NULL,
  text          TEXT                     NOT NULL,
  target_types  TARGET_TYPE[]            NOT NULL DEFAULT ARRAY['general']::TARGET_TYPE[],
  revision      INTEGER                  NOT NULL DEFAULT 1,
  base_version  INTEGER                  NULL,
  review_note   TEXT                     NULL,
  reviewed_by   BIGINT                   NULL REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at   TIMESTAMPTZ              NULL,
  created_at    TIMESTAMPTZ              NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ              NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT flow_template_requests_title_not_empty CHECK (length(trim(title)) > 0),
  CONSTRAINT flow_template_requests_text_not_empty CHECK (length(trim(text)) > 0),
  -- an edit always targets a template; an approved create links the template it produced
  CONSTRAINT flow_template_requests_template_link CHECK (
    (kind = 'update' AND template_id IS NOT NULL) OR
    (kind = 'create' AND (status <> 'approved' OR template_id IS NOT NULL))
  )
);

-- At most one open edit per template, so two proposals can never race to overwrite each other.
CREATE UNIQUE INDEX flow_template_requests_one_pending_update_idx
  ON flow_template_requests(template_id) WHERE status = 'pending';

CREATE INDEX flow_template_requests_requester_id_idx ON flow_template_requests(requester_id);
CREATE INDEX flow_template_requests_status_idx ON flow_template_requests(status);

CREATE OR REPLACE TRIGGER update_flow_template_requests_modified
  BEFORE UPDATE ON flow_template_requests
  FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- Requests with display names resolved, so the review queue can show who asked
-- and who reviewed without a per-row lookup.
CREATE VIEW flow_template_requests_view AS
SELECT
  r.id,
  r.kind,
  r.status,
  r.template_id,
  r.requester_id,
  r.title,
  r.text,
  r.target_types,
  r.revision,
  r.base_version,
  r.review_note,
  r.reviewed_by,
  r.reviewed_at,
  r.created_at,
  r.updated_at,
  COALESCE(NULLIF(ru.name, ''), ru.mail) AS requester_name,
  COALESCE(NULLIF(rv.name, ''), rv.mail, '') AS reviewer_name
FROM flow_template_requests r
JOIN users ru ON ru.id = r.requester_id
LEFT JOIN users rv ON rv.id = r.reviewed_by;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP VIEW IF EXISTS flow_template_requests_view;
DROP TABLE IF EXISTS flow_template_requests;
DROP TYPE IF EXISTS TEMPLATE_REQUEST_STATUS;
DROP TYPE IF EXISTS TEMPLATE_REQUEST_KIND;

DROP INDEX IF EXISTS flow_templates_live_idx;
ALTER TABLE flow_templates
  DROP COLUMN IF EXISTS archived_at,
  DROP COLUMN IF EXISTS version;

-- Orphaned templates need an owner again before user_id can be NOT NULL.
UPDATE flow_templates
SET user_id = (SELECT MIN(id) FROM users WHERE role_id = 1)
WHERE user_id IS NULL;

ALTER TABLE flow_templates DROP CONSTRAINT IF EXISTS flow_templates_user_id_fkey;
ALTER TABLE flow_templates
  ADD CONSTRAINT flow_templates_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE flow_templates ALTER COLUMN user_id SET NOT NULL;

INSERT INTO privileges (role_id, name) VALUES (2, 'templates.delete') ON CONFLICT DO NOTHING;
-- +goose StatementEnd
