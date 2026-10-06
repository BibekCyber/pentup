/**
 * Format validation for the scan wizard's Target field.
 *
 * This mirrors the format rules in backend/pkg/targetcheck/parse.go so an
 * obvious typo is caught as the user types, with no round trip. It is a
 * first pass only: whether the target actually exists is decided by the
 * backend's checkTarget query, which resolves and probes it. The backend
 * repeats both checks, so this one is for feedback, never for safety.
 */

export interface ParsedTarget {
    /** aws | azure | gcp, for account identifiers only. */
    cloudProvider?: string;
    /** Why the target was rejected; only set when shape is 'invalid'. */
    error?: string;
    /** Normalized hostname, or the IP literal. Empty for account identifiers. */
    host: string;
    /** Explicit port, or the scheme default for URLs. 0 when none was named. */
    port: number;
    shape: TargetShape;
}

/** What the target string looks like. Mirrors the backend's TargetKind. */
export type TargetShape = 'cloud_account' | 'host' | 'invalid' | 'ip' | 'url';

// AWS account IDs: 12 digits, bare or grouped as the console shows them.
const AWS_ACCOUNT_RE = /^(\d{12}|\d{4}-\d{4}-\d{4})$/;
// Azure subscription/tenant GUID, bare or as a resource ID.
const AZURE_ACCOUNT_RE = /^(?:\/subscriptions\/)?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i;
// GCP project in resource-name form. A bare project ID is indistinguishable
// from a typo, so the "projects/" prefix is required.
const GCP_PROJECT_RE = /^projects\/([a-z][a-z0-9-]{4,28}[a-z0-9])\/?$/;

// DNS labels: letters, digits, hyphens; underscores appear in real records.
const LABEL_RE = /^[a-z0-9_]([a-z0-9_-]*[a-z0-9_])?$/;
// Top-level domains are alphabetic, or punycode for IDN TLDs.
const TLD_RE = /^([a-z][a-z0-9-]*[a-z0-9]|xn--[a-z0-9-]+)$/;

const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

const MAX_TARGET_LENGTH = 2048;

const invalid = (error: string): ParsedTarget => ({ error, host: '', port: 0, shape: 'invalid' });

const isIPv4 = (value: string): boolean => {
    const match = IPV4_RE.exec(value);

    return !!match && match.slice(1).every((octet) => Number(octet) <= 255 && !/^0\d/.test(octet));
};

/**
 * Loose IPv6 detection: the browser's URL parser is the real authority, so
 * this only has to recognize the shape to route it correctly.
 */
const isIPv6 = (value: string): boolean =>
    /^[0-9a-f:]+$/i.test(value) && value.includes('::') ? true : /^([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/i.test(value);

const parseCloudAccount = (value: string): null | ParsedTarget => {
    if (AWS_ACCOUNT_RE.test(value)) {
        return { cloudProvider: 'aws', host: '', port: 0, shape: 'cloud_account' };
    }

    if (AZURE_ACCOUNT_RE.test(value)) {
        return { cloudProvider: 'azure', host: '', port: 0, shape: 'cloud_account' };
    }

    if (GCP_PROJECT_RE.test(value)) {
        return { cloudProvider: 'gcp', host: '', port: 0, shape: 'cloud_account' };
    }

    return null;
};

// Names that always mean the machine itself or a private network: loopback
// (RFC 6761), mDNS, and the internal zones clouds hand out.
const LOCAL_SUFFIXES = ['.localhost', '.local', '.internal', '.localdomain', '.home.arpa'];

/**
 * True when a hostname can only ever mean "not a public target", so the reason
 * given is the destination rather than the spelling — "localhost" must not be
 * told to try "localhost.com".
 */
const isLocalName = (host: string): boolean =>
    host === 'localhost' || LOCAL_SUFFIXES.some((suffix) => host.endsWith(suffix));

/** Validates a hostname, returning an error message or null. */
const hostnameError = (host: string): null | string => {
    const name = host.replace(/\.$/, '').toLowerCase();

    // Checked before the shape rules, so the reason names the destination.
    if (isLocalName(name)) {
        return `${name} is a local or internal name, not a public target. This platform only tests targets reachable over the public internet.`;
    }

    if (name.length > 253) {
        return 'That domain name is too long.';
    }

    const labels = name.split('.');

    if (labels.length < 2) {
        return `Enter a full domain such as ${name || 'acme'}.com, a URL or an IP address. A single word isn't a reachable host.`;
    }

    for (const label of labels) {
        if (label === '') {
            return 'That domain has an empty part (two dots in a row?).';
        }

        if (label.length > 63) {
            return 'Each part of a domain must be 63 characters or fewer.';
        }

        // Non-ASCII is left to the backend, which converts IDNs to punycode.
        if (!/[^\p{ASCII}]/u.test(label) && !LABEL_RE.test(label)) {
            return "That domain contains characters that aren't allowed.";
        }
    }

    // labels is non-empty: split always yields at least one element, and the
    // length check above rules out the single-label case.
    const tld = labels[labels.length - 1] ?? '';

    if (/^\d+$/.test(tld)) {
        return "That isn't a valid IP address or domain.";
    }

    if (!/[^\p{ASCII}]/u.test(tld) && !TLD_RE.test(tld)) {
        return "That domain doesn't end in a valid top-level domain (like .com).";
    }

    return null;
};

/**
 * Classifies and checks the format of a target string. A non-'invalid' shape
 * means the string is well formed, not that the target exists.
 */
export const parseTarget = (raw: string): ParsedTarget => {
    const value = raw.trim();

    if (!value) {
        return invalid('Enter a target.');
    }

    if (value.length > MAX_TARGET_LENGTH) {
        return invalid('The target is too long.');
    }

    if (/[\s]/.test(value)) {
        return invalid('Enter a single domain, URL or IP without spaces.');
    }

    const account = parseCloudAccount(value);

    if (account) {
        return account;
    }

    if (value.includes('/') && /^[^/]*\/\d{1,3}$/.test(value) && !value.includes('://')) {
        return invalid('IP ranges aren’t supported. Enter a single IP, domain or URL.');
    }

    if (isIPv4(value)) {
        return { host: value, port: 0, shape: 'ip' };
    }

    if (isIPv6(value)) {
        return { host: value, port: 0, shape: 'ip' };
    }

    const schemeMatch = /^([a-z][a-z0-9+.-]*):\/\//i.exec(value);

    if (schemeMatch) {
        const scheme = (schemeMatch[1] ?? '').toLowerCase();

        if (scheme !== 'http' && scheme !== 'https') {
            return invalid('Only http:// and https:// URLs are supported.');
        }
    } else if (/^https?:/i.test(value)) {
        return invalid('That URL is malformed. Did you mean https://…?');
    }

    let url: URL;

    try {
        url = new URL(schemeMatch ? value : `//${value}`, 'http://placeholder.invalid');
    } catch {
        return invalid("That isn't a valid domain, URL or IP address.");
    }

    if (url.username || url.password) {
        return invalid('Remove the username/password from the target. Add credentials in the Credentials step.');
    }

    let hostname = url.hostname;

    if (!hostname || hostname === 'placeholder.invalid') {
        return invalid('The target is missing a host, e.g. acme.com or https://app.acme.com.');
    }

    // The URL parser keeps IPv6 literals in brackets.
    const isBracketed = hostname.startsWith('[') && hostname.endsWith(']');

    if (isBracketed) {
        hostname = hostname.slice(1, -1);
    }

    let port = 0;

    if (url.port) {
        port = Number(url.port);

        if (!Number.isInteger(port) || port < 1 || port > 65535) {
            return invalid('Port must be between 1 and 65535.');
        }
    } else if (/:$/.test(value) || /:\/?$/.test(value.replace(/^[a-z]+:\/\//i, ''))) {
        return invalid("The port after ':' is empty.");
    }

    const hasScheme = !!schemeMatch;

    if (hasScheme && !port) {
        port = url.protocol === 'http:' ? 80 : 443;
    }

    if (isBracketed || isIPv4(hostname) || isIPv6(hostname)) {
        // The URL parser expands legacy IPv4 shorthand ("127.1" and hex forms)
        // into a full address. Go's parser rejects those, so reject anything
        // the parser rewrote rather than accept a target the server will not.
        if (isIPv4(hostname) && !value.includes(hostname)) {
            return invalid("That isn't a valid IP address or domain.");
        }

        return { host: hostname, port, shape: hasScheme ? 'url' : 'ip' };
    }

    let bare = hostname;

    if (bare.startsWith('*.')) {
        const path = url.pathname.replace(/^\/$/, '');

        if (hasScheme || port || path) {
            return invalid("A wildcard target can't include http(s)://, a port or a path. Enter it as *.acme.com.");
        }

        bare = bare.slice(2);
    }

    const error = hostnameError(bare);

    if (error) {
        return invalid(error);
    }

    return { host: bare.replace(/\.$/, '').toLowerCase(), port, shape: hasScheme ? 'url' : 'host' };
};

/** The format error for a target, or undefined when it is well formed. */
export const getTargetFormatError = (raw: string): string | undefined => parseTarget(raw).error;
