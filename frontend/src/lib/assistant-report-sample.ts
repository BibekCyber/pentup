import type { AssistantFragmentFragment, AssistantLogFragmentFragment, FlowFragmentFragment } from '@/graphql/types';

import { MessageLogType, ResultFormat, StatusType } from '@/graphql/types';

import { buildAssistantReportModel } from './build-assistant-report-model';

type SampleFlow = Pick<FlowFragmentFragment, 'createdAt' | 'id' | 'status' | 'title' | 'updatedAt'>;

export const assistantSampleFlow: SampleFlow = {
    createdAt: '2026-03-31T10:00:00.000Z',
    id: '5120',
    status: StatusType.Finished,
    title: 'Assistant Session — abc.xyz.com Security Review',
    updatedAt: '2026-03-31T10:38:00.000Z',
};

export const assistantSampleAssistant: Pick<AssistantFragmentFragment, 'title'> = { title: 'Security Assistant' };

let logSeq = 0;

const log = (type: MessageLogType, message: string, result = '', resultFormat: ResultFormat = ResultFormat.Markdown, thinking = ''): AssistantLogFragmentFragment => {
    logSeq += 1;

    return {
        appendPart: false,
        assistantId: '88',
        createdAt: new Date(new Date(assistantSampleFlow.createdAt).getTime() + logSeq * 60_000).toISOString(),
        flowId: assistantSampleFlow.id,
        id: `log-${logSeq}`,
        message,
        result,
        resultFormat,
        thinking: thinking || null,
        type,
    };
};

export const assistantSampleLogs: AssistantLogFragmentFragment[] = [
    log(MessageLogType.Input, 'Can you check abc.xyz.com for missing HTTP security headers and confirm whether the login form has rate limiting?'),
    log(MessageLogType.Thoughts, 'I will fetch the response headers, cross-check against the OWASP secure-headers list, then probe the login endpoint for rate limiting.'),
    log(MessageLogType.Terminal, 'curl -sI https://abc.xyz.com/', 'HTTP/2 200\nserver: nginx\ncontent-type: text/html; charset=UTF-8\n(no strict-transport-security)\n(no content-security-policy)\n(no referrer-policy)', ResultFormat.Terminal),
    log(MessageLogType.Search, 'OWASP recommended HTTP security headers', '- OWASP Secure Headers Project\n- MDN — HTTP security headers\n- securityheaders.com grading rubric'),
    log(
        MessageLogType.Report,
        ['### HTTP Security Headers', '', 'The response is **missing** several headers:', '', '- `Strict-Transport-Security` (HSTS)', '- `Content-Security-Policy` (CSP)', '- `Referrer-Policy`', '- `Permissions-Policy`', '', 'This raises the risk of XSS, clickjacking, MIME sniffing and downgraded HTTPS.'].join('\n'),
    ),
    log(
        MessageLogType.Answer,
        ['abc.xyz.com is missing the four key response headers above. To remediate:', '', '1. Add `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.', '2. Define a restrictive `Content-Security-Policy`.', '3. Set `Referrer-Policy: strict-origin-when-cross-origin`.', '4. Add a `Permissions-Policy` limiting camera/microphone/geolocation.'].join('\n'),
    ),
    log(MessageLogType.Done, ''),
    log(MessageLogType.Input, 'Now check whether the login form enforces any rate limiting or account lockout.'),
    log(MessageLogType.Terminal, 'for i in $(seq 1 50); do curl -s -o /dev/null -w "%{http_code}\\n" -d "email=t@t.io&password=x" https://abc.xyz.com/login; done', '200\n200\n200\n200\n200\n... (all 50 returned 200, no 429, no lockout)', ResultFormat.Terminal),
    log(MessageLogType.Advice, 'Lack of rate limiting enables credential stuffing and brute force; pair it with the weak-password-policy finding for a realistic account-takeover path.'),
    log(
        MessageLogType.Answer,
        ['No rate limiting is enforced. 50 rapid authentication requests were all accepted with `200 OK` — no `429 Too Many Requests` and no account lockout.', '', 'Recommend per-IP and per-account rate limiting, progressive backoff, and a lockout threshold with CAPTCHA after repeated failures.'].join('\n'),
    ),
    log(MessageLogType.Done, ''),
];

export const buildAssistantSampleReport = () =>
    buildAssistantReportModel(assistantSampleFlow, assistantSampleAssistant, assistantSampleLogs, { generatedAt: '2026-03-31T10:40:00.000Z' });

export const assistantSampleReportModel = buildAssistantSampleReport();
