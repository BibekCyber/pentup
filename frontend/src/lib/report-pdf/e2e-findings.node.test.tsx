import { renderToBuffer } from '@react-pdf/renderer';
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import type { FindingFragmentFragment, TaskFragmentFragment } from '@/graphql/types';

import { Severity, StatusType } from '@/graphql/types';
import { buildReportModel, mapFindings } from '@/lib/build-report-model';
import ReportDocument from '@/lib/report-pdf/report-document';

// Mirrors the production data path: backend GraphQL findings -> mapFindings ->
// buildReportModel -> ReportDocument, for the user's real "Audit API Auth Flows" run.
const gqlFindings: FindingFragmentFragment[] = [
    {
        affectedUrls: ['http://172.17.0.1:5173/api/auth/logout', 'http://172.17.0.1:5173/api/auth/me'],
        cvss: 9.1,
        description:
            'The logout endpoint returns 200 OK but the issued JWT remains valid indefinitely. After calling POST /api/auth/logout the same token still authenticates to /api/auth/me, so sessions cannot be revoked.',
        evidence:
            'POST /api/auth/logout -> 200 OK; subsequent GET /api/auth/me with the same token -> 200 OK {id:33, role:TEACHER}.',
        impact: ['Persistent unauthorized access after logout', 'Stolen tokens cannot be revoked'],
        recommendation:
            'Maintain a server-side token denylist (Redis, keyed by jti) and invalidate tokens on logout and password change.',
        references: ['https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html'],
        severity: Severity.Critical,
        stepsToReproduce: [
            'Authenticate and capture the access token cookie.',
            'Call POST /api/auth/logout and observe 200 OK.',
            'Replay GET /api/auth/me with the same token and observe a 200 OK authenticated response.',
        ],
        taskId: '9',
        title: 'JWT-001 Token Revocation Failure',
    },
    {
        cvss: 9,
        description:
            '50+ rapid authentication requests are accepted without 429 responses or account lockout, enabling credential stuffing.',
        impact: ['Credential stuffing and brute force at scale'],
        recommendation:
            'Add express-rate-limit backed by Redis (for example 5 attempts / 15 minutes) and account lockout on the auth endpoints.',
        severity: Severity.Critical,
        taskId: '9',
        title: 'AUTH-002 Missing Rate Limiting',
    },
    {
        cvss: 6.1,
        description:
            'The API reflects arbitrary Origin headers with credentials allowed, weakening the same-origin policy.',
        recommendation:
            'Restrict CORS to an explicit allowlist and avoid reflecting arbitrary origins with credentials.',
        severity: Severity.Medium,
        taskId: '9',
        title: 'HTTP-001 CORS Misconfiguration',
    },
    {
        cvss: 5.3,
        description:
            'No HttpOnly/Secure/SameSite cookie flags and missing CSP / X-Frame-Options / X-Content-Type-Options headers.',
        recommendation: 'Set secure cookie attributes and add the standard security headers via Helmet.js.',
        severity: Severity.Medium,
        taskId: '9',
        title: 'HTTP-002 Missing Security Headers',
    },
];

const tasks = [
    {
        createdAt: '2026-06-28T10:05:00Z',
        flowId: '15',
        id: '9',
        input: '<engagement_auth>internal prompt that must NOT appear in the report</engagement_auth> Focus on the auth model.',
        result: '## Assessment Summary\n\nThe authentication layer carries **HIGH** residual risk. Two critical and two medium issues were confirmed against `/api/auth/me`.\n\n- Broken logout (token revocation)\n- No rate limiting',
        status: StatusType.Finished,
        subtasks: [
            {
                createdAt: '2026-06-28T10:10:00Z',
                description: 'internal subtask prompt that must NOT appear',
                id: '76',
                result: '### Working Authentication\n\nThe token authenticates via the `Cookie` header. Only `GET /api/auth/me` was reachable; the four `/teacher/*` endpoints returned **404**.',
                status: StatusType.Finished,
                taskId: '9',
                title: 'Diagnose target connectivity and verify credentials',
                updatedAt: '2026-06-28T11:20:00Z',
            },
        ],
        title: 'Assess API Auth & Session: JWT Validation, Token Handling, Refresh Flows, Role Enforcement',
        updatedAt: '2026-06-28T11:42:00Z',
    },
] as unknown as TaskFragmentFragment[];

const flow = {
    createdAt: '2026-06-28T10:00:00Z',
    id: '15',
    status: StatusType.Finished,
    title: 'Audit API Auth Flows',
    updatedAt: '2026-06-28T23:00:00Z',
};

describe('end-to-end findings report (production path)', () => {
    it('renders a coherent finding-driven PDF', async () => {
        const model = buildReportModel(flow, tasks, mapFindings(gqlFindings));

        expect(model.summary.findingsBySeverity.critical).toBe(2);
        expect(model.summary.findingsBySeverity.medium).toBe(2);
        expect(model.summary.duration).toBe('1h 42m');

        const buffer = await renderToBuffer(<ReportDocument model={model} />);
        expect(buffer.length).toBeGreaterThan(5000);

        if (process.env.WRITE_PDF) {
            writeFileSync(process.env.WRITE_PDF, buffer);
        }
    });
});
