-- +goose Up
-- +goose StatementBegin
-- Structured findings for Assistant (conversational) flows. Unlike Automation flows
-- there is no per-task reporter, so findings are extracted by a cached LLM call over
-- the assistant's report output; findings_hash records the source content so the
-- extraction only re-runs when the assistant produces new report content.
ALTER TABLE assistants ADD COLUMN findings JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE assistants ADD COLUMN findings_hash TEXT NOT NULL DEFAULT '';
CREATE INDEX assistants_findings_gin_idx ON assistants USING GIN (findings);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS assistants_findings_gin_idx;
ALTER TABLE assistants DROP COLUMN IF EXISTS findings_hash;
ALTER TABLE assistants DROP COLUMN IF EXISTS findings;
-- +goose StatementEnd
