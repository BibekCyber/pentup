/**
 * Format validation for the scan-wizard credential step. The rules enforce the
 * real shape each platform requires (AWS key/secret/region, GCP service-account
 * JSON, Azure GUIDs, web URLs/email) so we never ship an obviously-malformed
 * credential to a scan. This runs in the browser for inline feedback; the
 * backend repeats the same shape checks (see scan_credentials_helpers.go) so a
 * bypassed client cannot store a malformed credential.
 *
 * NOTE: these are the *target's* credentials supplied by the operator, not an
 * account password for this platform, so the app-wide password-complexity rules
 * deliberately do not apply here.
 */

/** Which credential form is active; derived from target class + provider/type. */
export type CredentialBranch = 'aws' | 'azure' | 'gcp' | 'web-form' | 'web-token';

/** A map of field name → human-readable error, only for the invalid fields. */
export type CredentialErrors = Partial<Record<keyof CredentialValues, string>>;

/** The raw credential field values collected by the wizard. */
export interface CredentialValues {
    accessKeyId: string;
    appId: string;
    clientSecret: string;
    email: string;
    loginUrl: string;
    password: string;
    protectedUrl: string;
    region: string;
    secretAccessKey: string;
    serviceAccountJson: string;
    tenant: string;
    token: string;
}

// AWS access key IDs: AKIA (long-term) or ASIA (temporary) + 16 upper/digits.
const AWS_ACCESS_KEY_RE = /^(AKIA|ASIA)[0-9A-Z]{16}$/;
// AWS secret access keys are exactly 40 base64-ish characters.
const AWS_SECRET_RE = /^[A-Za-z0-9/+=]{40}$/;
// AWS regions look like us-east-1, eu-west-2, ap-southeast-1.
const AWS_REGION_RE = /^[a-z]{2}-[a-z]+-\d$/;
// Azure tenant/app IDs are GUIDs.
const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Pragmatic email check (one @, a dot in the domain, no whitespace).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Strips a leading "Bearer " prefix so a pasted header still validates. */
export const stripBearer = (value: string): string => value.replace(/^\s*Bearer\s+/i, '').trim();

/**
 * True when the value is an absolute http(s) URL with a real dotted host
 * (e.g. app.acme.com or 10.0.0.1) — "https://foo" is rejected because a bare
 * hostname with no dot is not a usable target.
 */
const isHttpUrl = (value: string): boolean => {
    try {
        const url = new URL(value.trim());

        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return false;
        }

        // Require a dotted host with non-empty labels on both sides of each dot.
        const host = url.hostname;

        return host.includes('.') && !host.startsWith('.') && !host.endsWith('.') && !host.includes('..');
    } catch {
        return false;
    }
};

/**
 * Returns a map of field → error message for the fields that are missing or
 * malformed for the given branch. An empty object means the branch is valid.
 */
export const getCredentialErrors = (branch: CredentialBranch, values: CredentialValues): CredentialErrors => {
    const errors: CredentialErrors = {};

    switch (branch) {
        case 'aws': {
            const key = values.accessKeyId.trim();

            if (!key) {
                errors.accessKeyId = 'Enter the AWS access key ID.';
            } else if (!AWS_ACCESS_KEY_RE.test(key)) {
                errors.accessKeyId = 'Must be AKIA/ASIA followed by 16 uppercase letters or digits.';
            }

            const secret = values.secretAccessKey.trim();

            if (!secret) {
                errors.secretAccessKey = 'Enter the AWS secret access key.';
            } else if (!AWS_SECRET_RE.test(secret)) {
                errors.secretAccessKey = 'AWS secret access keys are exactly 40 characters.';
            }

            // Region is optional, but validate the format when one is supplied.
            const region = values.region.trim();

            if (region && !AWS_REGION_RE.test(region)) {
                errors.region = 'Use a region like us-east-1.';
            }

            break;
        }

        case 'azure': {
            const tenant = values.tenant.trim();

            if (!tenant) {
                errors.tenant = 'Enter the tenant ID.';
            } else if (!GUID_RE.test(tenant)) {
                errors.tenant = 'Tenant ID must be a GUID (00000000-0000-0000-0000-000000000000).';
            }

            const appId = values.appId.trim();

            if (!appId) {
                errors.appId = 'Enter the application (client) ID.';
            } else if (!GUID_RE.test(appId)) {
                errors.appId = 'Application ID must be a GUID.';
            }

            const secret = values.clientSecret.trim();

            if (!secret) {
                errors.clientSecret = 'Enter the client secret.';
            } else if (secret.length < 8) {
                errors.clientSecret = 'Client secret looks too short.';
            }

            break;
        }

        case 'gcp': {
            const raw = values.serviceAccountJson.trim();

            if (!raw) {
                errors.serviceAccountJson = 'Paste the service-account JSON key.';
                break;
            }

            let parsed: unknown;

            try {
                parsed = JSON.parse(raw);
            } catch {
                errors.serviceAccountJson = "This isn't valid JSON — paste the whole key file.";
                break;
            }

            if (typeof parsed !== 'object' || parsed === null) {
                errors.serviceAccountJson = 'Expected a JSON object.';
                break;
            }

            const obj = parsed as Record<string, unknown>;

            if (obj.type !== 'service_account') {
                errors.serviceAccountJson = 'Missing "type": "service_account".';
            } else if (!obj.private_key) {
                errors.serviceAccountJson = 'Missing "private_key".';
            } else if (!obj.client_email) {
                errors.serviceAccountJson = 'Missing "client_email".';
            }

            break;
        }

        case 'web-form': {
            const loginUrl = values.loginUrl.trim();

            if (!loginUrl) {
                errors.loginUrl = 'Enter the login URL.';
            } else if (!isHttpUrl(loginUrl)) {
                errors.loginUrl = 'Enter a valid http(s) URL.';
            }

            const email = values.email.trim();

            if (!email) {
                errors.email = 'Enter the email or username.';
            } else if (/\s/.test(email)) {
                errors.email = 'Cannot contain spaces.';
            } else if (email.includes('@') && !EMAIL_RE.test(email)) {
                errors.email = 'Enter a valid email address.';
            }

            if (!values.password) {
                errors.password = 'Enter the password.';
            }

            break;
        }

        case 'web-token': {
            const token = stripBearer(values.token);

            if (!token) {
                errors.token = 'Enter the token or API key.';
            }

            const url = values.protectedUrl.trim();

            if (!url) {
                errors.protectedUrl = 'Enter a protected URL to test the token against.';
            } else if (!isHttpUrl(url)) {
                errors.protectedUrl = 'Enter a valid http(s) URL.';
            }

            break;
        }
    }

    return errors;
};

/** Convenience: true when the branch has no missing/malformed fields. */
export const isCredentialBranchValid = (branch: CredentialBranch, values: CredentialValues): boolean =>
    Object.keys(getCredentialErrors(branch, values)).length === 0;
