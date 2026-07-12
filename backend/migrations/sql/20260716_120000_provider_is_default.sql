-- +goose Up
-- +goose StatementBegin
ALTER TABLE providers ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS providers_one_default_per_user
  ON providers(user_id) WHERE is_default AND deleted_at IS NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS providers_one_default_per_user;
ALTER TABLE providers DROP COLUMN IF EXISTS is_default;
-- +goose StatementEnd
