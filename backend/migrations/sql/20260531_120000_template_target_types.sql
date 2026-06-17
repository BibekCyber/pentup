-- +goose Up
-- +goose StatementBegin
CREATE TYPE TARGET_TYPE AS ENUM (
  'web_app',
  'api',
  'aws',
  'azure',
  'gcp',
  'network',
  'mobile_backend',
  'general'
);

ALTER TABLE flow_templates
  ADD COLUMN target_types TARGET_TYPE[] NOT NULL DEFAULT ARRAY['general']::TARGET_TYPE[],
  ADD COLUMN default_template BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN system_owned BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX flow_templates_target_types_idx ON flow_templates USING GIN (target_types);
CREATE INDEX flow_templates_system_owned_idx ON flow_templates(system_owned);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS flow_templates_system_owned_idx;
DROP INDEX IF EXISTS flow_templates_target_types_idx;

ALTER TABLE flow_templates
  DROP COLUMN IF EXISTS system_owned,
  DROP COLUMN IF EXISTS default_template,
  DROP COLUMN IF EXISTS target_types;

DROP TYPE IF EXISTS TARGET_TYPE;
-- +goose StatementEnd
