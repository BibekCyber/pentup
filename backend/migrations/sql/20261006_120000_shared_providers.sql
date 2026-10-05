-- +goose Up
-- Providers become one shared, admin-managed set instead of a private set per
-- user. Only roles holding settings.providers.admin may see or manage them;
-- everyone else's scans, chats and assistants run on the shared default.

-- +goose StatementBegin
-- Remove providers created by users who cannot manage providers. Nothing
-- references providers by id (flows and assistants store the provider name),
-- so their scans keep their history but can no longer be resumed.
DELETE FROM providers p
WHERE NOT EXISTS (
  SELECT 1
  FROM users u
  JOIN privileges pr ON pr.role_id = u.role_id
  WHERE u.id = p.user_id AND pr.name = 'settings.providers.admin'
);
-- +goose StatementEnd

-- +goose StatementBegin
-- Names are now unique across all users. Where two admins used the same name
-- the oldest provider keeps it; the others get their id appended and their
-- owner's flows and assistants are repointed so they still resolve.
WITH dupes AS (
  SELECT id, user_id, name AS old_name, name || ' (' || id || ')' AS new_name
  FROM (
    SELECT id, user_id, name,
           row_number() OVER (PARTITION BY name ORDER BY created_at, id) AS rn
    FROM providers
    WHERE deleted_at IS NULL
  ) ranked
  WHERE rn > 1
),
moved_flows AS (
  UPDATE flows f SET model_provider_name = d.new_name
  FROM dupes d
  WHERE f.user_id = d.user_id AND f.model_provider_name = d.old_name
),
moved_assistants AS (
  UPDATE assistants a SET model_provider_name = d.new_name
  FROM dupes d, flows f
  WHERE a.flow_id = f.id AND f.user_id = d.user_id AND a.model_provider_name = d.old_name
)
UPDATE providers p SET name = d.new_name
FROM dupes d
WHERE p.id = d.id;
-- +goose StatementEnd

-- +goose StatementBegin
-- Keep a single default: the one set by the earliest admin.
UPDATE providers SET is_default = false
WHERE is_default AND deleted_at IS NULL AND id <> (
  SELECT id FROM providers
  WHERE is_default AND deleted_at IS NULL
  ORDER BY user_id, id
  LIMIT 1
);
-- +goose StatementEnd

-- +goose StatementBegin
DROP INDEX IF EXISTS providers_name_user_id_unique;
DROP INDEX IF EXISTS providers_one_default_per_user;
CREATE UNIQUE INDEX providers_name_unique
  ON providers(name) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX providers_one_default
  ON providers(is_default) WHERE is_default AND deleted_at IS NULL;
-- +goose StatementEnd

-- +goose StatementBegin
-- Roles that cannot manage providers lose every provider privilege, including
-- listing provider names. Resolvers also check settings.providers.admin
-- because sessions cache privileges until the next login.
DELETE FROM privileges
WHERE name IN (
  'providers.view',
  'settings.providers.view',
  'settings.providers.edit',
  'settings.providers.subscribe'
)
AND role_id NOT IN (
  SELECT role_id FROM privileges WHERE name = 'settings.providers.admin'
);
-- +goose StatementEnd

-- +goose Down
-- Deleted user providers and renamed duplicates are not restored.

-- +goose StatementBegin
INSERT INTO privileges (role_id, name) VALUES
  (2, 'providers.view'),
  (2, 'settings.providers.view'),
  (2, 'settings.providers.edit'),
  (2, 'settings.providers.subscribe')
ON CONFLICT DO NOTHING;
-- +goose StatementEnd

-- +goose StatementBegin
DROP INDEX IF EXISTS providers_one_default;
DROP INDEX IF EXISTS providers_name_unique;
CREATE UNIQUE INDEX IF NOT EXISTS providers_name_user_id_unique
  ON providers(name, user_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS providers_one_default_per_user
  ON providers(user_id) WHERE is_default AND deleted_at IS NULL;
-- +goose StatementEnd
