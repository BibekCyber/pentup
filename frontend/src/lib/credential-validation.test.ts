import { describe, expect, it } from 'vitest';

import {
    type CredentialValues,
    getCredentialErrors,
    isCredentialBranchValid,
    stripBearer,
} from './credential-validation';

const empty: CredentialValues = {
    accessKeyId: '',
    appId: '',
    clientSecret: '',
    email: '',
    loginUrl: '',
    password: '',
    protectedUrl: '',
    region: '',
    secretAccessKey: '',
    serviceAccountJson: '',
    tenant: '',
    token: '',
};

const make = (overrides: Partial<CredentialValues>): CredentialValues => ({ ...empty, ...overrides });

const VALID_SECRET = 'a'.repeat(40);
const VALID_GUID = '00000000-0000-0000-0000-000000000000';

describe('stripBearer', () => {
    it('removes a leading Bearer prefix case-insensitively', () => {
        expect(stripBearer('Bearer abc123')).toBe('abc123');
        expect(stripBearer('  bearer   abc123 ')).toBe('abc123');
        expect(stripBearer('abc123')).toBe('abc123');
    });
});

describe('getCredentialErrors — aws', () => {
    it('accepts a well-formed AWS credential', () => {
        const errors = getCredentialErrors('aws', make({
            accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
            region: 'us-east-1',
            secretAccessKey: VALID_SECRET,
        }));
        expect(errors).toEqual({});
    });

    it('rejects a bad access key id and short secret', () => {
        const errors = getCredentialErrors('aws', make({
            accessKeyId: 'nope',
            secretAccessKey: 'short',
        }));
        expect(errors.accessKeyId).toBeDefined();
        expect(errors.secretAccessKey).toBeDefined();
    });

    it('requires fields when empty', () => {
        const errors = getCredentialErrors('aws', empty);
        expect(errors.accessKeyId).toBeDefined();
        expect(errors.secretAccessKey).toBeDefined();
    });

    it('treats region as optional but validates its format', () => {
        expect(getCredentialErrors('aws', make({
            accessKeyId: 'ASIAIOSFODNN7EXAMPLE',
            secretAccessKey: VALID_SECRET,
        })).region).toBeUndefined();
        expect(getCredentialErrors('aws', make({
            accessKeyId: 'ASIAIOSFODNN7EXAMPLE',
            region: 'US_EAST',
            secretAccessKey: VALID_SECRET,
        })).region).toBeDefined();
    });
});

describe('getCredentialErrors — gcp', () => {
    it('accepts a valid service-account JSON', () => {
        const json = JSON.stringify({
            client_email: 'svc@proj.iam.gserviceaccount.com',
            private_key: '-----BEGIN PRIVATE KEY-----',
            type: 'service_account',
        });
        expect(getCredentialErrors('gcp', make({ serviceAccountJson: json }))).toEqual({});
    });

    it('flags non-JSON input', () => {
        expect(getCredentialErrors('gcp', make({ serviceAccountJson: 'not json' })).serviceAccountJson).toBeDefined();
    });

    it('flags a missing required key with a distinct message', () => {
        const json = JSON.stringify({ private_key: 'x', type: 'service_account' });
        expect(getCredentialErrors('gcp', make({ serviceAccountJson: json })).serviceAccountJson).toContain(
            'client_email',
        );
    });

    it('flags the wrong type', () => {
        const json = JSON.stringify({ client_email: 'a@b.c', private_key: 'x', type: 'user' });
        expect(getCredentialErrors('gcp', make({ serviceAccountJson: json })).serviceAccountJson).toContain(
            'service_account',
        );
    });
});

describe('getCredentialErrors — azure', () => {
    it('accepts GUIDs and a non-trivial secret', () => {
        expect(getCredentialErrors('azure', make({
            appId: VALID_GUID,
            clientSecret: 'super-secret-value',
            tenant: VALID_GUID,
        }))).toEqual({});
    });

    it('rejects non-GUID tenant/app and a short secret', () => {
        const errors = getCredentialErrors('azure', make({
            appId: 'also-bad',
            clientSecret: 'x',
            tenant: 'bad',
        }));
        expect(errors.tenant).toBeDefined();
        expect(errors.appId).toBeDefined();
        expect(errors.clientSecret).toBeDefined();
    });
});

describe('getCredentialErrors — web-token', () => {
    it('accepts a token and https protected URL', () => {
        expect(getCredentialErrors('web-token', make({
            protectedUrl: 'https://app.acme.com/api/me',
            token: 'Bearer abc',
        }))).toEqual({});
    });

    it('rejects a non-URL and empty token', () => {
        const errors = getCredentialErrors('web-token', make({ protectedUrl: 'acme.com', token: 'Bearer ' }));
        expect(errors.token).toBeDefined();
        expect(errors.protectedUrl).toBeDefined();
    });

    it('rejects a URL whose host has no dot', () => {
        const errors = getCredentialErrors('web-token', make({ protectedUrl: 'https://foo', token: 'abc' }));
        expect(errors.protectedUrl).toBeDefined();
    });

    it('accepts an http(s) URL with an IP host', () => {
        const errors = getCredentialErrors('web-token', make({ protectedUrl: 'http://10.0.0.1:8080/me', token: 'abc' }));
        expect(errors.protectedUrl).toBeUndefined();
    });
});

describe('getCredentialErrors — web-form', () => {
    it('accepts a URL, email and password', () => {
        expect(getCredentialErrors('web-form', make({
            email: 'tester@acme.com',
            loginUrl: 'https://app.acme.com/login',
            password: 'hunter2',
        }))).toEqual({});
    });

    it('accepts a bare username (no @)', () => {
        expect(getCredentialErrors('web-form', make({
            email: 'testuser',
            loginUrl: 'https://app.acme.com/login',
            password: 'hunter2',
        }))).toEqual({});
    });

    it('rejects a malformed email and empty password', () => {
        const errors = getCredentialErrors('web-form', make({
            email: 'bad@',
            loginUrl: 'https://app.acme.com/login',
        }));
        expect(errors.email).toBeDefined();
        expect(errors.password).toBeDefined();
    });
});

describe('isCredentialBranchValid', () => {
    it('mirrors getCredentialErrors emptiness', () => {
        expect(isCredentialBranchValid('aws', empty)).toBe(false);
        expect(isCredentialBranchValid('aws', make({
            accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
            secretAccessKey: VALID_SECRET,
        }))).toBe(true);
    });
});
