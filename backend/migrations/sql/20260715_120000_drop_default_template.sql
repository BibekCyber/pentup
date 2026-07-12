-- +goose Up
-- +goose StatementBegin
ALTER TABLE flow_templates DROP COLUMN IF EXISTS default_template;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE flow_templates ADD COLUMN IF NOT EXISTS default_template BOOLEAN NOT NULL DEFAULT false;
-- +goose StatementEnd
