-- +goose Up
-- +goose StatementBegin
-- Additive: add 'cloud' to TARGET_TYPE. PG16 allows ADD VALUE in a transaction
-- when the value is not used in the same transaction (the re-tag lives in a
-- separate later migration). Enum values cannot be dropped, so Down is a no-op.
ALTER TYPE TARGET_TYPE ADD VALUE IF NOT EXISTS 'cloud';
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- Postgres cannot drop an enum value in place; nothing to revert.
-- +goose StatementEnd
