-- +goose Up
-- +goose StatementBegin
-- Structured vulnerability findings emitted by the reporter agent alongside the
-- markdown task result. Stored as a JSON array of finding objects so the report
-- (web + PDF) can render finding cards and an accurate severity summary instead
-- of parsing them out of free-form markdown.
ALTER TABLE tasks ADD COLUMN findings JSONB NOT NULL DEFAULT '[]'::jsonb;
CREATE INDEX tasks_findings_gin_idx ON tasks USING GIN (findings);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS tasks_findings_gin_idx;
ALTER TABLE tasks DROP COLUMN IF EXISTS findings;
-- +goose StatementEnd
