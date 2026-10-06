import { describe, expect, it } from 'vitest';

import { getTargetFormatError, parseTarget, type TargetShape } from './target-validation';

// These mirror backend/pkg/targetcheck/parse_test.go. The two must agree, or
// the wizard will show an error the server does not, or vice versa.
describe('parseTarget accepts real targets', () => {
    const cases: Array<[string, string, TargetShape, number]> = [
        ['acme.com', 'acme.com', 'host', 0],
        ['api.staging.acme.co.uk', 'api.staging.acme.co.uk', 'host', 0],
        ['ACME.com', 'acme.com', 'host', 0],
        ['acme.com.', 'acme.com', 'host', 0],
        ['_dmarc.acme.com', '_dmarc.acme.com', 'host', 0],
        ['acme-assets.s3.amazonaws.com', 'acme-assets.s3.amazonaws.com', 'host', 0],
        ['*.acme.com', 'acme.com', 'host', 0],
        ['acme.com:8443', 'acme.com', 'host', 8443],
        ['https://app.acme.com', 'app.acme.com', 'url', 443],
        ['http://app.acme.com', 'app.acme.com', 'url', 80],
        ['https://app.acme.com:8443/x', 'app.acme.com', 'url', 8443],
        ['https://api.acme.com/v2/users', 'api.acme.com', 'url', 443],
        ['https://api.acme.com/s?q=1', 'api.acme.com', 'url', 443],
        ['HTTPS://acme.com', 'acme.com', 'url', 443],
        ['203.0.113.9', '203.0.113.9', 'ip', 0],
        ['203.0.113.9:8080', '203.0.113.9', 'ip', 8080],
        ['2606:4700::1111', '2606:4700::1111', 'ip', 0],
        ['[2606:4700::1111]:443', '2606:4700::1111', 'ip', 443],
        ['https://[2606:4700::1111]/', '2606:4700::1111', 'url', 443],
        ['acmedata.blob.core.windows.net', 'acmedata.blob.core.windows.net', 'host', 0],
        ['acme.technology', 'acme.technology', 'host', 0],
        ['acme.xn--p1ai', 'acme.xn--p1ai', 'host', 0],
    ];

    it.each(cases)('accepts %s', (input, host, shape, port) => {
        const parsed = parseTarget(input);

        expect(parsed.error).toBeUndefined();
        expect(parsed.shape).toBe(shape);
        expect(parsed.host).toBe(host);
        expect(parsed.port).toBe(port);
    });
});

describe('parseTarget recognizes cloud account identifiers', () => {
    const cases: Array<[string, string]> = [
        ['123456789012', 'aws'],
        ['1234-5678-9012', 'aws'],
        ['6f4a1b2c-3d4e-5f60-7182-93a4b5c6d7e8', 'azure'],
        ['/subscriptions/6F4A1B2C-3D4E-5F60-7182-93A4B5C6D7E8', 'azure'],
        ['projects/acme-prod-1234', 'gcp'],
    ];

    it.each(cases)('recognizes %s as %s', (input, provider) => {
        const parsed = parseTarget(input);

        expect(parsed.shape).toBe('cloud_account');
        expect(parsed.cloudProvider).toBe(provider);
    });
});

describe('parseTarget rejects malformed targets', () => {
    const cases: string[] = [
        '',
        '   ',
        'sjhfga',
        'my target',
        'acme..com',
        '.acme.com',
        'acme.123',
        '10.0.0.256',
        '127.1',
        '10.0.0.0/8',
        'ftp://acme.com',
        'file:///etc/passwd',
        'gopher://acme.com',
        'javascript:alert(1)',
        'https://admin:pw@acme.com',
        'https:acme.com',
        'acme.com:70000',
        'acme.com:0',
        'acme.com:abc',
        `${'a'.repeat(64)}.com`,
        '*.acme.com/admin',
        'https://*.acme.com',
    ];

    it.each(cases)('rejects %j', (input) => {
        const parsed = parseTarget(input);

        expect(parsed.shape).toBe('invalid');
        expect(parsed.error).toBeTruthy();
    });
});

describe('getTargetFormatError', () => {
    it('is undefined for a well-formed target', () => {
        expect(getTargetFormatError('acme.com')).toBeUndefined();
        expect(getTargetFormatError('https://api.acme.com/v1/health')).toBeUndefined();
    });

    it('explains a single word', () => {
        expect(getTargetFormatError('sjhfga')).toMatch(/full domain/i);
    });

    it('points credentials at the right step', () => {
        expect(getTargetFormatError('https://admin:pw@acme.com')).toMatch(/credentials step/i);
    });
});

// Mirrors TestValidatorRejectsLocalNames: a name that can only mean this
// machine is refused for where it points, not for how it is spelled.
describe('parseTarget rejects local and internal names', () => {
    const cases = [
        'localhost',
        'http://localhost:8000/scans/new',
        'localhost:8080',
        'api.localhost',
        'printer.local',
        'db.internal',
        'box.localdomain',
        'gateway.home.arpa',
    ];

    it.each(cases)('rejects %s', (input) => {
        const error = getTargetFormatError(input);

        expect(error).toBeTruthy();
        expect(error).toMatch(/local or internal name/i);
        expect(error).not.toMatch(/\.com/);
    });
});
