import type { FlowFragmentFragment, SubtaskFragmentFragment, TaskFragmentFragment } from '@/graphql/types';

import { StatusType, TargetType } from '@/graphql/types';

import type { Finding } from './report-model';

import { buildReportModel } from './build-report-model';

type SampleFlow = Pick<FlowFragmentFragment, 'createdAt' | 'id' | 'status' | 'title' | 'updatedAt'>;

export const sampleFlow: SampleFlow = {
    createdAt: '2026-03-31T09:15:00.000Z',
    id: '4271',
    status: StatusType.Finished,
    title: 'Web Application Penetration Test — abc.xyz.com',
    updatedAt: '2026-03-31T14:42:00.000Z',
};

const OWASP_ACCESS_CONTROL = 'https://owasp.org/Top10/A01_2021-Broken_Access_Control/';
const OWASP_AUTH_CHEATSHEET = 'https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html';

export const sampleFindings: Finding[] = [
    {
        affectedUrls: [
            'https://abc.xyz.com/nova-vendor/sanctum-tokens/tokens/users/{id}',
            'https://abc.xyz.com/nova/resources/users/{id}',
        ],
        cvss: 8.5,
        description:
            'The application uses predictable, incremental numeric identifiers across multiple endpoints. Authenticated users can change the `id` parameter to read other users’ data because the server does not enforce object-level access control, enabling horizontal privilege escalation and mass enumeration of PII.',
        evidence:
            'Authenticating as a low-privileged account and replaying `GET /nova/resources/users/{id}` in Burp Repeater with arbitrary IDs returned 200 OK responses containing other users’ profile data and token associations. A Burp Intruder number payload over the `id` parameter confirmed systematic enumeration.',
        id: 'f-idor',
        impact: [
            'Unauthorized access to sensitive user and partner data.',
            'Exposure of PII and internal system information.',
            'Horizontal privilege escalation across accounts.',
            'Increased risk of data scraping and mass enumeration.',
            'Potential compliance and data-protection violations.',
        ],
        stepsToReproduce: [
            'Authenticate with a low-privileged account and proxy traffic through Burp Suite.',
            'Locate a `GET /nova/resources/users/{id}` request in the proxy history and send it to Repeater.',
            'Modify the `{id}` parameter to a different value and resend — the response returns another user’s profile data and token associations.',
            'Send the request to Intruder, mark `{id}` as a numeric payload, and run — multiple 200 OK responses confirm enumeration of other users’ PII.',
        ],
        recommendation:
            'Enforce server-side, object-level authorization on every resource request; verify the requested object belongs to the authenticated principal. Replace predictable numeric IDs with non-guessable identifiers (UUIDs) and add rate limiting plus monitoring to detect enumeration.',
        references: [
            OWASP_ACCESS_CONTROL,
            'https://owasp.org/www-community/attacks/Insecure_Direct_Object_Reference',
            'https://portswigger.net/web-security/access-control/idor',
        ],
        screenshots: [{ id: 's-idor', name: 'Burp Repeater — 200 OK returned for an arbitrary user ID', url: '' }],
        severity: 'high',
        taskId: '3',
        title: 'Insecure Direct Object Reference (IDOR) via Predictable User ID',
    },
    {
        affectedUrls: [
            'https://abc.xyz.com/nova/dashboards/usa-dashboard',
            'https://abc.xyz.com/nova/dashboards/participant-dashboard',
            'https://abc.xyz.com/nova/resources/users',
            'https://abc.xyz.com/nova/resources/partners',
            'https://abc.xyz.com/nova/resources/roles',
            'https://abc.xyz.com/nova/resources/abilities',
        ],
        cvss: 8.3,
        description:
            'Administrative `/nova/*` dashboards and resource routes are reachable by non-admin authenticated users through forced browsing. The backend relies on client-side controls and does not perform server-side role validation, exposing privileged functionality and data.',
        evidence:
            'A non-admin session request was replayed in Burp Repeater with the path changed to `/nova/dashboards/usa-dashboard`; the server returned admin-only data, confirmed via Burp’s render view.',
        id: 'f-bac',
        impact: [
            'Unauthorized access to other users’ sensitive information.',
            'Horizontal privilege escalation across accounts.',
            'Potential exposure of authentication-related data (tokens, metadata).',
            'Increased risk of large-scale enumeration and data scraping.',
        ],
        stepsToReproduce: [
            'Authenticate with a low-privileged account and intercept traffic in Burp Suite.',
            'Send any authenticated request to Repeater.',
            'Change the path to `/nova/dashboards/usa-dashboard` and resend — the server returns admin-only data (confirmed via Burp’s render view).',
        ],
        recommendation:
            'Enforce strict server-side RBAC on every endpoint and validate the authenticated user’s role and privileges before serving administrative routes. Add regression access-control tests.',
        references: [
            OWASP_ACCESS_CONTROL,
            'https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html',
        ],
        severity: 'high',
        taskId: '3',
        title: 'Broken Access Control via Admin Endpoint Access',
    },
    {
        affectedUrls: ['https://abc.xyz.com/'],
        cvss: 7.5,
        description:
            'The single-partner creation limit is enforced only in the UI/application logic, not atomically on the server. Sending several concurrent creation requests before the state updates creates multiple partner accounts, bypassing the business rule.',
        evidence:
            'Using Burp Repeater’s “Send group (parallel)” feature with 4–5 duplicated partner-creation requests produced multiple partner entities, confirming the absence of locking or atomic transactions.',
        id: 'f-race',
        impact: [
            'Bypass of business logic enforcing single-partner creation.',
            'Unauthorized creation of multiple partner accounts.',
            'Potential abuse of partner-level privileges and system resources.',
            'Data-integrity issues from inconsistent state management.',
        ],
        stepsToReproduce: [
            'Authenticate as an administrator and open the profile section.',
            'Intercept the partner-creation request and forward it to Repeater.',
            'Create a tab group, duplicate the request 4–5 times, and use “Send group (parallel)”.',
            'Return to the browser — multiple partner entities now exist, bypassing the single-partner limit.',
        ],
        recommendation:
            'Enforce the limit server-side using atomic database transactions or row-level locking. Apply request locking/rate limiting to sensitive endpoints and add concurrency tests.',
        references: [
            'https://owasp.org/www-community/attacks/Race_Condition',
            'https://portswigger.net/web-security/race-conditions',
        ],
        severity: 'high',
        taskId: '3',
        title: 'Race Condition Bypass of Partner Creation Limit',
    },
    {
        affectedUrls: ['https://abc.xyz.com/'],
        cve: 'CVE-2021-23337',
        cvss: 6.5,
        description:
            'The frontend ships outdated libraries with disclosed CVEs: Lodash 4.17.19 (CVE-2021-23337, command injection via template) and Moment.js 2.29.0 (CVE-2022-31129, ReDoS). These increase the client-side attack surface with well-documented, low-complexity exploits.',
        evidence:
            'Wappalyzer fingerprinting of the application identified the vulnerable Lodash and Moment.js versions in the loaded assets.',
        id: 'f-libs',
        impact: [
            'Exposure to publicly known exploits targeting outdated libraries.',
            'Potential remote code execution / command injection (Lodash).',
            'Denial of service via ReDoS (Moment.js).',
        ],
        stepsToReproduce: [
            'Browse to the application with the Wappalyzer extension active.',
            'Review the detected technologies — Lodash 4.17.19 and Moment.js 2.29.0 are flagged with known CVEs.',
        ],
        recommendation:
            'Upgrade Lodash to 4.17.21 or later and Moment.js to its latest secure release (or migrate to a maintained alternative). Add automated SCA dependency scanning to CI.',
        references: [
            'https://nvd.nist.gov/vuln/detail/CVE-2021-23337',
            'https://nvd.nist.gov/vuln/detail/CVE-2022-31129',
        ],
        severity: 'medium',
        taskId: '1',
        title: 'Use of Vulnerable Third-Party JavaScript Libraries with Known CVEs',
    },
    {
        affectedUrls: ['https://abc.xyz.com/'],
        cvss: 6.3,
        description:
            'Service enumeration found SSH (22), HTTP (80) and HTTPS (443) exposed with version banners (OpenSSH 9.6p1 Ubuntu, nginx). Version disclosure enables precise vulnerability mapping and targeted exploitation or brute-force against SSH.',
        evidence:
            'A targeted `nmap -sV -p 22,80,443 abc.xyz.com` scan reported the open ports and disclosed the exact OpenSSH and nginx versions.',
        id: 'f-ports',
        impact: [
            'Enables fingerprinting of exact versions for targeted exploitation.',
            'Increased risk from known OpenSSH vulnerabilities if unpatched.',
            'Facilitates brute-force / credential-stuffing against the SSH service.',
            'Assists reconnaissance for chaining with other findings.',
        ],
        stepsToReproduce: [
            'Run `nmap -sV -p 22,80,443 abc.xyz.com` from a Linux terminal.',
            'Confirm ports 22/80/443 are open and SSH discloses OpenSSH 9.6p1 (Ubuntu).',
        ],
        recommendation:
            'Restrict unnecessary exposure, suppress version/banner disclosure, enforce key-based SSH auth with IP allow-listing, and keep services patched.',
        references: ['https://www.openssh.com/security.html', 'https://owasp.org/www-project-top-ten/'],
        severity: 'medium',
        taskId: '1',
        title: 'Exposed Network Services and Open Ports Identified',
    },
    {
        affectedUrls: ['https://abc.xyz.com/'],
        cvss: 6.2,
        description:
            'No WAF fronts the application, so all traffic reaches the backend directly with no perimeter filtering against SQL injection, XSS or application-layer DoS. This is also a compliance gap for SOC 2 / ISO 27001.',
        evidence: 'A `wafw00f https://abc.xyz.com/` scan reported no WAF present.',
        id: 'f-waf',
        impact: [
            'Increased exposure to web attacks (SQLi, XSS, application-layer DoS).',
            'No automated traffic filtering or protection at the perimeter.',
            'Potential non-conformity for SOC 2 / ISO 27001.',
        ],
        stepsToReproduce: [
            'Run `wafw00f https://abc.xyz.com/` from a Linux terminal.',
            'Confirm the output reports that no WAF is present.',
        ],
        recommendation:
            'Deploy and tune a WAF to filter and monitor traffic, enable logging of malicious requests, and keep rulesets current with threat and compliance standards.',
        references: [
            'https://owasp.org/www-community/Web_Application_Firewall',
            'https://www.iso.org/isoiec-27001-information-security.html',
        ],
        severity: 'medium',
        taskId: '1',
        title: 'Missing Web Application Firewall (WAF) Security Layer',
    },
    {
        affectedUrls: ['https://abc.xyz.com/'],
        cvss: 6.1,
        description:
            'Account deletion executes without re-authentication or password confirmation. Anyone with temporary access to a valid session (hijacking, shared/unattended device) can irreversibly delete the account without knowing the credentials.',
        evidence:
            'From an authenticated session, clicking delete and confirming permanently removed the account with no password or MFA challenge.',
        id: 'f-deletion',
        impact: [
            'Unauthorized account deletion if session access is obtained.',
            'Increased risk from session hijacking or unattended sessions.',
            'Permanent, irreversible loss of user data and access.',
            'Weak protection for sensitive account-level operations.',
        ],
        stepsToReproduce: [
            'Authenticate and open the profile section.',
            'Click the delete control and confirm — the account is deleted with no password or MFA challenge.',
        ],
        recommendation:
            'Require password re-authentication or MFA before destructive actions like account deletion, add a secure confirmation step, and log/monitor deletions.',
        references: [OWASP_AUTH_CHEATSHEET, 'https://cwe.mitre.org/data/definitions/522.html'],
        severity: 'medium',
        taskId: '2',
        title: 'No Password Verification for Account Deletion',
    },
    {
        affectedUrls: ['https://abc.xyz.com/'],
        cvss: 6.0,
        description:
            'Existing sessions remain valid after a password change. Previously issued tokens continue to grant access, so an attacker holding a leaked or hijacked session keeps access even after the victim resets their password, defeating the recovery mechanism.',
        evidence:
            'Logging in on two browsers and changing the password in Browser A left Browser B’s session fully active without re-authentication.',
        id: 'f-session',
        impact: [
            'Persistent unauthorized access using previously issued tokens.',
            'Password change is ineffective as a recovery mechanism.',
            'Increased risk where a session is leaked or hijacked.',
            'Potential compromise of sensitive user data and actions.',
        ],
        stepsToReproduce: [
            'Log in to the same account in two separate browsers.',
            'Change the password in Browser A.',
            'Confirm Browser B’s session remains active without re-authentication.',
        ],
        recommendation:
            'Invalidate all active sessions immediately on password change, implement server-side session tracking/revocation, and force re-authentication across devices.',
        references: [
            'https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html',
            'https://cwe.mitre.org/data/definitions/613.html',
        ],
        severity: 'medium',
        taskId: '2',
        title: 'Session Not Invalidated After Password Change',
    },
    {
        affectedUrls: ['https://abc.xyz.com/nova-api/leads'],
        cvss: 4.1,
        description:
            'Malformed input to `POST /nova-api/leads` triggers an unhandled HTTP 500 that leaks full query details, table/column names (e.g. `business_postal_code`) and a Laravel stack trace, revealing schema and framework internals and lowering attack complexity.',
        evidence:
            'Submitting crafted payloads across all form fields and replaying the request in Burp Repeater returned a verbose SQL error disclosing database and framework details.',
        id: 'f-sqlerror',
        impact: [
            'Disclosure of database schema and internal application structure.',
            'Increased risk of SQL injection and other injection-based attacks.',
            'Exposure of backend framework and file paths aiding targeted attacks.',
            'Information leakage that can facilitate privilege escalation or lateral movement.',
        ],
        stepsToReproduce: [
            'Authenticate as an administrator and open the “Create File” form.',
            'Populate every field with a crafted payload, submit, and intercept the request in Burp.',
            'Resend the request in Repeater — the server returns a verbose SQL/Laravel error disclosing schema and paths.',
        ],
        recommendation:
            'Return generic error responses, disable verbose error reporting in production, validate/sanitize all input, and centralize error logging without exposing internals to clients.',
        references: [
            'https://owasp.org/Top10/A05_2021-Security_Misconfiguration/',
            'https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html',
        ],
        severity: 'medium',
        taskId: '3',
        title: 'Verbose SQL Error Disclosure Vulnerability',
    },
    {
        affectedUrls: ['https://abc.xyz.com/register'],
        cvss: 3.3,
        description:
            'Registration and password updates accept weak passwords (e.g. `12345678`) with no length, complexity or breached-password checks, making accounts susceptible to brute force, credential stuffing and guessing.',
        evidence: 'Registering with the password `12345678` succeeded with no strength validation.',
        id: 'f-weakpass',
        impact: [
            'Account compromise via brute-force or credential-stuffing.',
            'Weak authentication posture leading to unauthorized access.',
            'Higher likelihood of password-reuse exploitation across services.',
            'Potential exposure of sensitive user and organisational data.',
        ],
        stepsToReproduce: [
            'Open the registration page and enter the password `12345678`.',
            'Submit the form — the account is created with no strength enforcement.',
        ],
        recommendation:
            'Enforce a strong password policy (minimum length and complexity) on both client and server, block common/breached passwords, and add lockout plus MFA.',
        references: [
            'https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/',
            'https://pages.nist.gov/800-63-3/sp800-63b.html',
        ],
        severity: 'low',
        taskId: '2',
        title: 'Weak Password Policy Enforcement Allows Use of Weak Credentials',
    },
    {
        affectedUrls: ['https://abc.xyz.com/register'],
        cvss: 3.1,
        description:
            'Registration does not verify ownership of the supplied email, allowing creation of unverified, fraudulent or disposable accounts and enabling spam, bot registration and impersonation.',
        evidence:
            'Submitting the registration form with an arbitrary email created an active account without any verification step.',
        id: 'f-emailverify',
        impact: [
            'Creation of fake or fraudulent user accounts.',
            'Increased spam, abuse and automated bot registrations.',
            'Potential user impersonation and lack of accountability.',
            'Degradation of platform trust and data integrity.',
        ],
        stepsToReproduce: [
            'Open the registration page and submit with an arbitrary email address.',
            'Confirm the account is created and usable without any email verification.',
        ],
        recommendation:
            'Require mandatory email verification with secure, time-limited tokens before activating accounts; restrict features until verified and rate-limit registrations.',
        references: ['https://owasp.org/www-community/controls/Email_verification', OWASP_AUTH_CHEATSHEET],
        severity: 'low',
        taskId: '2',
        title: 'Missing Email Verification During User Registration Process',
    },
    {
        affectedUrls: ['https://abc.xyz.com/'],
        cvss: 2.1,
        description:
            'Key response headers are absent — Strict-Transport-Security, Content-Security-Policy, Referrer-Policy and Permissions-Policy — increasing exposure to XSS, clickjacking, MIME sniffing, referrer leakage and downgraded HTTPS enforcement.',
        evidence: 'A securityheaders.com scan of the domain reported the missing headers.',
        id: 'f-headers',
        impact: [
            'Increased risk of XSS and clickjacking.',
            'Potential sensitive-data leakage via referrer information.',
            'Abuse of browser features (camera, microphone, geolocation).',
            'Reduced enforcement of secure HTTPS connections.',
            'Higher overall client-side attack surface.',
        ],
        stepsToReproduce: [
            'Scan the domain on securityheaders.com.',
            'Confirm Strict-Transport-Security, Content-Security-Policy, Referrer-Policy and Permissions-Policy are absent.',
        ],
        recommendation:
            'Configure HSTS, a restrictive Content-Security-Policy, Referrer-Policy and Permissions-Policy, and set X-Content-Type-Options and X-Frame-Options.',
        references: [
            'https://owasp.org/www-project-secure-headers/',
            'https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html',
        ],
        severity: 'low',
        taskId: '1',
        title: 'Missing HTTP Security Headers Leading to Increased Attack Surface',
    },
];

const subtask = (
    id: string,
    taskId: string,
    title: string,
    result: string,
    description = '',
): SubtaskFragmentFragment => ({
    createdAt: sampleFlow.createdAt,
    description,
    id,
    result,
    status: StatusType.Finished,
    taskId,
    title,
    updatedAt: sampleFlow.updatedAt,
});

const task2Report = [
    '## Task Completed Successfully',
    '',
    'The API Authentication & Session Security assessment is complete. The findings below summarise what was tested and the residual risk.',
    '',
    '### Assessment Overview',
    '',
    'The authentication and session-management layer carries a **HIGH** residual risk. Account-lifecycle flows accept weak credentials, skip email verification, and fail to revoke sessions on credential change.',
    '',
    '### Critical Vulnerabilities (CVSS 9.0+)',
    '',
    '- **JWT-001 Token Revocation Failure (CVSS 9.1):** `POST /api/auth/logout` returns `200 OK` but the issued token remains valid indefinitely. PoC demonstrates token reuse after logout.',
    '- **AUTH-002 Missing Rate Limiting (CVSS 9.0):** 50+ rapid authentication requests are accepted without `429` responses or account lockout.',
    '',
    '### Medium Risk Issues',
    '',
    '- **HTTP-001 CORS Misconfiguration (CVSS 6.1):** the API reflects arbitrary `Origin` headers with credentials allowed.',
    '- **HTTP-002 Missing Security Headers (CVSS 5.3):** no `HttpOnly`/`Secure`/`SameSite` cookie flags; missing CSP, X-Frame-Options and HSTS.',
    '',
    '### Recommended Remediation',
    '',
    '1. Maintain a server-side token denylist and invalidate tokens on logout and password change.',
    '2. Enforce rate limiting and account lockout on authentication endpoints.',
    '3. Restrict CORS to an explicit allowlist and set secure cookie flags.',
].join('\n');

const subtask21Report = [
    '### Registration & Password Policy',
    '',
    'Registered an account with the password `12345678` — accepted with **no** strength validation, and the account activated **without** email verification.',
    '',
    '**Observed weaknesses:**',
    '',
    '- No minimum length or complexity enforcement',
    '- No breached-password check',
    '- No confirmation email before activation',
    '',
    'Recommendation: enforce a 12+ character policy with complexity, block breached passwords, and require email verification before activation.',
].join('\n');

const subtask22Report = [
    '### Session Lifecycle',
    '',
    'Logged in on two browsers; changing the password in Browser A left Browser B fully authenticated. The session store does not track or revoke issued tokens on credential change.',
    '',
    '**Findings:**',
    '',
    '- Logout returns `200 OK` but the token remains valid',
    '- A password change does not revoke other active sessions',
    '- No server-side session registry exists',
    '',
    'Recommendation: add server-side session tracking and revoke all sessions on logout and password change.',
].join('\n');

const subtask11Report = [
    '### Service & Port Enumeration',
    '',
    '`nmap -sV -p 22,80,443 abc.xyz.com` reported three open ports with disclosed versions:',
    '',
    '- **22/tcp** — OpenSSH 9.6p1 (Ubuntu)',
    '- **80/tcp** — nginx',
    '- **443/tcp** — nginx (TLS)',
    '',
    'Version banners enable precise vulnerability mapping.',
].join('\n');

const subtask12Report = [
    '### Technology Fingerprinting',
    '',
    'Wappalyzer identified outdated client libraries with disclosed CVEs:',
    '',
    '- **Lodash 4.17.19** — CVE-2021-23337 (command injection)',
    '- **Moment.js 2.29.0** — CVE-2022-31129 (ReDoS)',
].join('\n');

export const sampleTasks: TaskFragmentFragment[] = [
    {
        createdAt: sampleFlow.createdAt,
        flowId: sampleFlow.id,
        id: '1',
        input: 'Enumerate exposed services, fingerprint the technology stack, and assess perimeter and transport-layer hardening for abc.xyz.com.',
        result: 'Passive OSINT and an `nmap -sV` scan mapped the external surface (SSH/HTTP/HTTPS with version banners). Wappalyzer fingerprinting flagged outdated JavaScript dependencies, `wafw00f` confirmed no WAF, and a security-headers scan revealed several missing response headers.',
        status: StatusType.Finished,
        subtasks: [
            subtask('11', '1', 'Service & port enumeration (nmap)', subtask11Report),
            subtask('12', '1', 'Technology fingerprinting (Wappalyzer)', subtask12Report),
        ],
        title: 'Reconnaissance & Infrastructure Assessment',
        updatedAt: sampleFlow.updatedAt,
    },
    {
        createdAt: sampleFlow.createdAt,
        flowId: sampleFlow.id,
        id: '2',
        input: 'Evaluate registration, credential strength, session lifecycle and protection of sensitive account actions.',
        result: task2Report,
        status: StatusType.Finished,
        subtasks: [
            subtask(
                '21',
                '2',
                'Registration & password policy review',
                subtask21Report,
                'Tested the public registration and password-update flows.',
            ),
            subtask('22', '2', 'Session lifecycle review', subtask22Report),
        ],
        title: 'Authentication & Session Management Testing',
        updatedAt: sampleFlow.updatedAt,
    },
    {
        createdAt: sampleFlow.createdAt,
        flowId: sampleFlow.id,
        id: '3',
        input: 'Probe object-level and function-level authorization, concurrency handling, and server-side input/error handling.',
        result: 'Authorization testing uncovered predictable-ID IDOR and forced-browsing access to admin `/nova/*` routes. A concurrency test bypassed the single-partner business rule via a race condition, and malformed input produced verbose SQL/Laravel error disclosure.',
        status: StatusType.Finished,
        subtasks: [
            subtask(
                '31',
                '3',
                'Object-level authorization (IDOR)',
                '### Object-Level Authorization (IDOR)\n\nReplaying `GET /nova/resources/users/{id}` with arbitrary IDs returned **200 OK** responses containing other users’ PII, confirming horizontal access via predictable identifiers.',
            ),
            subtask(
                '32',
                '3',
                'Concurrency / race-condition testing',
                '### Concurrency / Race Condition\n\nBurp Repeater’s parallel send with 4–5 duplicated partner-creation requests **bypassed the single-partner limit**, creating multiple partner entities.',
            ),
        ],
        title: 'Access Control & Business Logic Testing',
        updatedAt: sampleFlow.updatedAt,
    },
];

const sampleExecutiveSummary = {
    content:
        'A grey-box penetration test of the abc.xyz.com web application identified weaknesses across access control, authentication, session management and configuration. The assessment found 3 high, 6 medium and 3 low-severity issues — including predictable-ID IDOR, forced-browsing access to administrative endpoints, and a race condition that bypasses a business-logic limit — that together enable unauthorized data access, privilege escalation, account compromise and service abuse. No issue allowed immediate remote code execution or full system compromise. Prioritising the access-control and authentication findings, and hardening configuration and dependencies, will materially reduce the attack surface.',
    generatedAt: '2026-03-31T15:00:00.000Z',
};

export const buildSampleReport = () =>
    buildReportModel(sampleFlow, sampleTasks, sampleFindings, {
        executiveSummary: sampleExecutiveSummary,
        generatedAt: '2026-03-31T15:00:00.000Z',
        targetType: TargetType.WebApp,
    });

export const sampleReportModel = buildSampleReport();
