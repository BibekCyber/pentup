-- +goose Up
-- +goose StatementBegin
-- Additive: add 'waiting' to the DOMAIN_STATUS enum. Postgres 16 allows
-- ALTER TYPE ... ADD VALUE inside a transaction as long as the new value is not
-- USED in the same transaction (it isn't here). Enum values cannot be dropped in
-- place, so this is additive-only and the Down is a no-op.
ALTER TYPE DOMAIN_STATUS ADD VALUE IF NOT EXISTS 'waiting';
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- Postgres cannot drop an enum value in place; nothing to revert.
-- +goose StatementEnd
