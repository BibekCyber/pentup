import { renderToBuffer } from '@react-pdf/renderer';
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import type { AssistantLogFragmentFragment } from '@/graphql/types';

import { MessageLogType, ResultFormat, StatusType } from '@/graphql/types';
import { buildAssistantReportModel } from '@/lib/build-assistant-report-model';
import ReportDocument from '@/lib/report-pdf/report-document';

let seq = 0;

const mk = (type: MessageLogType, message = ''): AssistantLogFragmentFragment => {
    seq += 1;

    return { appendPart: false, assistantId: '1', createdAt: new Date(Date.parse('2026-06-29T10:00:00Z') + seq * 1000).toISOString(), flowId: '9', id: `l${seq}`, message, result: '', resultFormat: ResultFormat.Markdown, thinking: null, type };
};

const finalReport = `## 🔴 Critical Findings

1. **Privilege Escalation via Registration** (CVSS 9.8)
Endpoint: \`POST /api/auth/register\`
The registration endpoint allows arbitrary role assignment. An attacker can register with "role":"TEACHER".
Remediation: Remove role parameter; default all users to STUDENT.

2. **Mass Student Data Exposure** (CVSS 8.6)
Returns all students' personal data without ownership verification.

## 🟠 Medium Findings

🔧 Immediate Recommendations

1. **Remove role parameter** from /api/auth/register
2. **Add authorization middleware** to /api/analysis/* endpoints

Overall Risk Rating: 🔴 HIGH. Algorithm confusion (HS256→None) was blocked ✅.`;

const logs = [
    mk(MessageLogType.Input, '<engagement_auth>\nThis is an AUTHENTICATED engagement (credential kind: email_password). Do NOT print /work/.pentagi_target_credentials.\n</engagement_auth>\nThe target for this engagement is: https://example.test/ (web_app).\nPerform a full penetration test of the target web application.'),
    mk(MessageLogType.Answer, "I'll conduct a comprehensive penetration test. Let me start by reading the credentials."),
    mk(MessageLogType.Answer, 'Let me explore the application structure first.'),
    mk(MessageLogType.Answer, 'Found it! The login endpoint is /api/auth/login.'),
    mk(MessageLogType.Terminal, 'gobuster dir -u https://example.test -w wordlist.txt'),
    mk(MessageLogType.Terminal, 'curl -X POST https://example.test/api/auth/register -d role=TEACHER'),
    mk(MessageLogType.Report, finalReport),
    mk(MessageLogType.Done),
];

// Structured findings as the backend extractor (ExtractFindings) would return them.
const extractedFindings = [
    { affectedUrls: ['https://example.test/api/auth/register'], cvss: 9.8, description: 'The registration endpoint allows arbitrary role assignment; an attacker can register with role TEACHER.', id: 'af-1', recommendation: 'Remove the role parameter from registration; default all users to STUDENT.', severity: 'critical' as const, title: 'Privilege Escalation via Registration' },
    { affectedUrls: ['https://example.test/api/analysis/students'], cvss: 8.6, description: "Returns all students' personal data without ownership verification.", id: 'af-2', recommendation: 'Verify the requesting teacher owns the semester before returning student data.', severity: 'high' as const, title: 'Mass Student Data Exposure' },
    { cvss: 7.5, description: 'No rate limiting on authentication endpoints enables brute force.', id: 'af-3', recommendation: 'Add IP-based rate limiting and CAPTCHA.', severity: 'medium' as const, title: 'Missing Rate Limiting on Authentication' },
];

describe('assistant e2e render (flow-9 shape, with extracted findings)', () => {
    it('renders cleanly: no XML, finding cards + matching summary, emoji stripped', async () => {
        const model = buildAssistantReportModel({ createdAt: '2026-06-29T10:00:00Z', id: '9', status: StatusType.Finished, title: 'Full Web App Pentest', updatedAt: '2026-06-29T10:30:00Z' }, { title: 'Full Web App Pentest' }, logs, { findings: extractedFindings, generatedAt: 'now' });

        expect(model.summary.findingsTotal).toBe(3);
        expect(model.summary.findingsBySeverity.critical).toBe(1);
        expect(model.sectionsTitle).toBe('Conversation');
        expect(model.sections[0]?.title).not.toContain('engagement_auth');

        const buf = await renderToBuffer(<ReportDocument model={model} />);
        expect(buf.length).toBeGreaterThan(5000);

        if (process.env.WRITE_PDF) {
            writeFileSync(process.env.WRITE_PDF, buf);
        }
    });
});
