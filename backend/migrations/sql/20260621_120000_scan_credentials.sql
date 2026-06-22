-- +goose Up
-- +goose StatementBegin
-- Engagement "scan" additions, all additive so existing domains/flows are untouched.
-- scope/box are nullable: NULL means a pre-existing domain or a scan with no
-- engagement posture set. CHECK allows NULL plus the valid values.
-- We use TEXT+CHECK (not Postgres ENUMs) intentionally: it keeps the sqlc-generated
-- Go types as plain strings, avoids the REST models Valid() whitelist requirement,
-- and makes the Down migration trivial. Validation is enforced in CHECK + the app.
ALTER TABLE domains ADD COLUMN scope TEXT NULL CHECK (scope IN ('internal','external'));
ALTER TABLE domains ADD COLUMN box   TEXT NULL CHECK (box   IN ('grey','black'));

-- Encrypted target credentials for a scan. We store ONLY the AES-256-GCM
-- ciphertext (base64 of nonce||ciphertext+tag, produced by pkg/crypt); never the
-- plaintext. One active (non-deleted) credential per domain is expected, but the
-- table allows history via soft-delete.
CREATE TABLE scan_credentials (
  id          BIGINT       PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id     BIGINT       NOT NULL REFERENCES users(id),
  domain_id   BIGINT       NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  kind        TEXT         NOT NULL CHECK (kind IN ('web_token','email_password','cloud_keys')),
  ciphertext  TEXT         NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX scan_credentials_domain_id_idx ON scan_credentials(domain_id);
CREATE INDEX scan_credentials_user_id_idx   ON scan_credentials(user_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS scan_credentials_user_id_idx;
DROP INDEX IF EXISTS scan_credentials_domain_id_idx;
DROP TABLE IF EXISTS scan_credentials;
ALTER TABLE domains DROP COLUMN IF EXISTS box;
ALTER TABLE domains DROP COLUMN IF EXISTS scope;
-- +goose StatementEnd
