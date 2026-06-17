-- +goose Up
-- +goose StatementBegin
CREATE TYPE DOMAIN_STATUS AS ENUM ('created','classifying','running','finished','failed');

CREATE TABLE domains (
  id                  BIGINT          PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id             BIGINT          NOT NULL REFERENCES users(id),
  name                TEXT            NOT NULL,
  target_type         TARGET_TYPE     NOT NULL DEFAULT 'general',
  status              DOMAIN_STATUS   NOT NULL DEFAULT 'created',
  detection_metadata  JSONB           NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ     DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMPTZ     DEFAULT CURRENT_TIMESTAMP,
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX domains_user_id_idx ON domains(user_id);
CREATE INDEX domains_status_idx  ON domains(status);

ALTER TABLE flows ADD COLUMN domain_id   BIGINT NULL REFERENCES domains(id);
ALTER TABLE flows ADD COLUMN template_id BIGINT NULL REFERENCES flow_templates(id);
CREATE INDEX flows_domain_id_idx   ON flows(domain_id);
CREATE INDEX flows_template_id_idx ON flows(template_id);

-- Domain orchestration privileges. Admin (role 1) gets domains.admin which the
-- backend treats as an override for every domains.* permission; both roles get
-- the granular privileges so non-admin owners can manage their own domains.
INSERT INTO privileges (role_id, name) VALUES
    (1, 'domains.admin'),
    (1, 'domains.view'),
    (1, 'domains.create'),
    (1, 'domains.delete'),
    (1, 'domains.subscribe'),
    (2, 'domains.view'),
    (2, 'domains.create'),
    (2, 'domains.delete'),
    (2, 'domains.subscribe')
    ON CONFLICT DO NOTHING;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DELETE FROM privileges WHERE name IN (
    'domains.admin',
    'domains.view',
    'domains.create',
    'domains.delete',
    'domains.subscribe'
);
DROP INDEX IF EXISTS flows_template_id_idx;
DROP INDEX IF EXISTS flows_domain_id_idx;
ALTER TABLE flows DROP COLUMN IF EXISTS template_id;
ALTER TABLE flows DROP COLUMN IF EXISTS domain_id;
DROP INDEX IF EXISTS domains_status_idx;
DROP INDEX IF EXISTS domains_user_id_idx;
DROP TABLE IF EXISTS domains;
DROP TYPE IF EXISTS DOMAIN_STATUS;
-- +goose StatementEnd
