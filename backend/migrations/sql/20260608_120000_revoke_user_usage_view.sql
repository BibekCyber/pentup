-- +goose Up
-- +goose StatementBegin
-- Restrict usage/analytics dashboards to admins: revoke usage.view from the
-- regular User role (role_id = 2). Admin (role_id = 1) keeps usage.view and
-- usage.admin. The GraphQL/REST resolvers already enforce this privilege, so
-- this migration is the actual security boundary.
DELETE FROM privileges WHERE role_id = 2 AND name = 'usage.view';
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
INSERT INTO privileges (role_id, name) VALUES (2, 'usage.view') ON CONFLICT DO NOTHING;
-- +goose StatementEnd
