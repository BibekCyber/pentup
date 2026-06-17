-- +goose Up
-- +goose StatementBegin
-- Seed platform-provided ("system owned") flow templates.
-- These are owned by the admin user (id = 1) so that read queries which return
-- "user_id = $1 OR system_owned = true" can surface them to every user, while
-- editing/deleting them remains gated behind the templates.admin privilege.
-- The insert is guarded so re-running (or running on a fresh DB without the admin
-- user yet) is safe and idempotent.
INSERT INTO flow_templates (user_id, title, text, target_types, system_owned, default_template)
SELECT v.user_id, v.title, v.text, v.target_types, true, v.default_template
FROM (
  VALUES
    (1::BIGINT,
     'Web Application Pentest',
     'Perform a full penetration test of the target web application. Enumerate endpoints, map the attack surface, and test for the OWASP Top 10 (injection, broken access control, XSS, SSRF, authentication flaws). Report each finding with reproduction steps, impact, and remediation.',
     ARRAY['web_app']::TARGET_TYPE[],
     true),
    (1::BIGINT,
     'Web App Recon & Surface Mapping',
     'Run reconnaissance against the target web application: discover subdomains, crawl reachable pages, fingerprint technologies and frameworks, and identify exposed endpoints and parameters. Summarize the attack surface for follow-up testing.',
     ARRAY['web_app']::TARGET_TYPE[],
     false),
    (1::BIGINT,
     'API Security Audit',
     'Audit the target REST/GraphQL API. Enumerate routes and methods, test authentication and authorization on every endpoint, check for BOLA/IDOR, mass assignment, rate-limiting gaps, and insecure data exposure. Document findings with example requests and remediation.',
     ARRAY['api']::TARGET_TYPE[],
     true),
    (1::BIGINT,
     'API Authentication Review',
     'Focus on the authentication and session model of the target API: token handling, JWT validation, refresh flows, scope/role enforcement, and credential stuffing resistance. Report weaknesses and concrete fixes.',
     ARRAY['api']::TARGET_TYPE[],
     false),
    (1::BIGINT,
     'AWS Cloud Recon',
     'Enumerate the target AWS environment from the provided credentials/scope. Inventory IAM users, roles and policies, S3 buckets, EC2/ECS/Lambda, security groups, and publicly exposed resources. Flag misconfigurations and over-privileged identities with remediation guidance.',
     ARRAY['aws']::TARGET_TYPE[],
     true),
    (1::BIGINT,
     'Azure Cloud Recon',
     'Enumerate the target Azure tenant/subscription. Review Entra ID roles and assignments, storage accounts, network security groups, key vaults, and public endpoints. Highlight misconfigurations and excessive permissions with remediation steps.',
     ARRAY['azure']::TARGET_TYPE[],
     true),
    (1::BIGINT,
     'GCP Cloud Recon',
     'Enumerate the target Google Cloud project(s). Review IAM bindings and service accounts, Cloud Storage buckets, firewall rules, GKE clusters, and externally reachable services. Report misconfigurations and least-privilege violations with fixes.',
     ARRAY['gcp']::TARGET_TYPE[],
     true),
    (1::BIGINT,
     'Network Scan & Service Enumeration',
     'Scan the target network range. Discover live hosts, enumerate open ports and running services, fingerprint versions, and identify outdated or vulnerable services. Produce a prioritized findings report with remediation.',
     ARRAY['network']::TARGET_TYPE[],
     true),
    (1::BIGINT,
     'Internal Network Pentest',
     'Perform an internal network penetration test: enumerate hosts and services, attempt safe credential and misconfiguration checks, identify lateral-movement paths, and map trust relationships. Report exploitable paths and hardening recommendations.',
     ARRAY['network']::TARGET_TYPE[],
     false),
    (1::BIGINT,
     'Mobile Backend Security Test',
     'Test the backend that powers the target mobile application. Inspect the API contract used by the app, test authentication/session handling, verify server-side authorization, and check for insecure data exposure and broken object-level access. Report findings with remediation.',
     ARRAY['mobile_backend','api']::TARGET_TYPE[],
     true),
    (1::BIGINT,
     'General Security Assessment',
     'Perform a broad security assessment of the provided target. Determine the target type, gather reconnaissance, identify the most relevant attack surface, and test for high-impact vulnerabilities. Summarize findings, impact, and remediation in a clear report.',
     ARRAY['general']::TARGET_TYPE[],
     true)
) AS v(user_id, title, text, target_types, default_template)
WHERE EXISTS (SELECT 1 FROM users WHERE id = 1)
  AND NOT EXISTS (
    SELECT 1 FROM flow_templates ft
    WHERE ft.system_owned = true AND ft.title = v.title
  );
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DELETE FROM flow_templates
WHERE system_owned = true
  AND title IN (
    'Web Application Pentest',
    'Web App Recon & Surface Mapping',
    'API Security Audit',
    'API Authentication Review',
    'AWS Cloud Recon',
    'Azure Cloud Recon',
    'GCP Cloud Recon',
    'Network Scan & Service Enumeration',
    'Internal Network Pentest',
    'Mobile Backend Security Test',
    'General Security Assessment'
  );
-- +goose StatementEnd
