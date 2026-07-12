-- +goose Up
-- +goose StatementBegin
-- Re-tag the system seed cloud templates (aws/azure/gcp) to the single 'cloud'
-- target type so they surface under the new Cloud engagement filter.
UPDATE flow_templates
SET target_types = ARRAY['cloud']::TARGET_TYPE[]
WHERE system_owned = true
  AND ('aws' = ANY(target_types) OR 'azure' = ANY(target_types) OR 'gcp' = ANY(target_types));
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- Irreversible re-tag; leave as-is (original per-provider tags are not restored).
-- +goose StatementEnd
