-- +goose Up
-- Restore per-provider tags on the system cloud templates and add a generic
-- cloud template.
--
-- Migration 20260714 collapsed the AWS/Azure/GCP system recon templates to the
-- single 'cloud' tag because the UI could only surface the generic Cloud type.
-- The scan wizard now filters cloud templates by the chosen provider (AWS/Azure
-- /GCP) plus generic Cloud, so each provider recon template is re-tagged back to
-- its provider and a provider-agnostic "Cloud Infrastructure Review" template is
-- seeded with the generic 'cloud' tag so it shows for every provider.
--
-- All statements are idempotent and safe to run on a fresh DB (where they run
-- after the 20260714 collapse) and on an already-migrated deployment.

-- +goose StatementBegin
UPDATE flow_templates
SET target_types = ARRAY['aws']::TARGET_TYPE[]
WHERE system_owned = true AND title = 'AWS Cloud Recon';
-- +goose StatementEnd

-- +goose StatementBegin
UPDATE flow_templates
SET target_types = ARRAY['azure']::TARGET_TYPE[]
WHERE system_owned = true AND title = 'Azure Cloud Recon';
-- +goose StatementEnd

-- +goose StatementBegin
UPDATE flow_templates
SET target_types = ARRAY['gcp']::TARGET_TYPE[]
WHERE system_owned = true AND title = 'GCP Cloud Recon';
-- +goose StatementEnd

-- +goose StatementBegin
-- Generic, provider-agnostic cloud template. Tagged 'cloud' so it surfaces for
-- AWS, Azure and GCP engagements alike. Guarded so re-running is idempotent and
-- it is skipped until the admin user (id = 1) exists.
INSERT INTO flow_templates (user_id, title, text, target_types, system_owned)
SELECT 1,
       'Cloud Infrastructure Review',
       'Perform a provider-agnostic security review of the target cloud environment using the supplied credentials and scope. Inventory identities, roles and permissions, storage, compute, networking and secrets. Identify public exposure, over-privileged identities, missing encryption and logging gaps, and other common cloud misconfigurations. Report each finding with impact and remediation guidance.',
       ARRAY['cloud']::TARGET_TYPE[],
       true
WHERE EXISTS (SELECT 1 FROM users WHERE id = 1)
  AND NOT EXISTS (
    SELECT 1 FROM flow_templates ft
    WHERE ft.system_owned = true AND ft.title = 'Cloud Infrastructure Review'
  );
-- +goose StatementEnd

-- +goose Down
-- Revert to the pre-migration state: collapse the provider recon templates back
-- to the generic 'cloud' tag and drop the generic cloud template.

-- +goose StatementBegin
UPDATE flow_templates
SET target_types = ARRAY['cloud']::TARGET_TYPE[]
WHERE system_owned = true
  AND title IN ('AWS Cloud Recon', 'Azure Cloud Recon', 'GCP Cloud Recon');
-- +goose StatementEnd

-- +goose StatementBegin
DELETE FROM flow_templates
WHERE system_owned = true AND title = 'Cloud Infrastructure Review';
-- +goose StatementEnd
