import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, Copy, FileSymlink, PanelRightClose, PanelRightOpen, Save, Send } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { z } from 'zod';

import TargetTypeChip from '@/components/forms/target-type-chip';
import TargetTypePicker from '@/components/forms/target-type-picker';
import CommandBar from '@/components/layouts/command-bar';
import ConfirmationDialog from '@/components/shared/confirmation-dialog';
import { getRequestStatusLabel } from '@/components/templates/request-status-pill';
import TemplateNotice from '@/components/templates/template-notice';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextareaAutosize } from '@/components/ui/input-group';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import {
    TargetType,
    TemplateRequestKind,
    TemplateRequestStatus,
    useFlowTemplateQuery,
    useFlowTemplateRequestQuery,
} from '@/graphql/types';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils/format';
import {
    type Template as LibraryTemplate,
    type TemplateRequest,
    toTemplate,
    toTemplateRequest,
    useTemplates,
} from '@/providers/templates-provider';

// Mirrors the server-side limits (pkg/graph/flow_template_requests_helpers.go).
const TITLE_MAX_LENGTH = 200;
const TEXT_MAX_LENGTH = 20000;

const formSchema = z.object({
    targetTypes: z.array(z.nativeEnum(TargetType)).min(1, { message: 'Select at least one target type' }),
    text: z
        .string()
        .trim()
        .min(1, { message: 'Text is required' })
        .max(TEXT_MAX_LENGTH, { message: `Content must be at most ${TEXT_MAX_LENGTH.toLocaleString()} characters` }),
    title: z
        .string()
        .trim()
        .min(1, { message: 'Title is required' })
        .max(TITLE_MAX_LENGTH, { message: `Title must be at most ${TITLE_MAX_LENGTH} characters` }),
});

type FormValues = z.infer<typeof formSchema>;

const PRESET_TEMPLATES: { text: string; title: string }[] = [
    {
        text: `Perform comprehensive security assessment of web application: {{TARGET_URL}}

Action plan:
1. Application Exploration: Navigate all pages, test features, identify endpoints and input vectors
2. Vulnerability Testing per endpoint:
   - Path Traversal: attempt to read /etc/passwd, focus on file download/upload features
   - XSS: inject unique markers, scan responses, craft context-specific payloads
   - SQL Injection: run sqlmap on inputs, use tamper scripts for WAF bypass
   - Command Injection: use time-based detection, try commix utility
   - SSRF: use Interactsh for OOB, target file upload/PDF generation endpoints
   - XXE: test XML uploads and Office documents
   - Unsafe File Upload: test executable extensions, double extensions, null byte injection
   - CSRF: test token validation, POST to GET conversion
3. Authentication & Session: test for broken authentication, session fixation, weak password policies
4. Business Logic: identify privilege escalation, price manipulation, workflow bypass opportunities
5. Report: document all findings with reproduction steps and proof-of-concept exploits`,
        title: 'Web Application Security Assessment',
    },
    {
        text: `Perform network infrastructure reconnaissance of target: {{TARGET_NETWORK}}

Action plan:
1. Network Discovery: identify live hosts using nmap ping sweeps, map network topology
2. Port Scanning: comprehensive port scan (1-65535), identify all open services
3. Service Enumeration: fingerprint service versions, detect OS information
4. Vulnerability Scanning: run automated vulnerability scans against discovered services
5. SSL/TLS Analysis: check certificate validity, weak ciphers, protocol vulnerabilities
6. Banner Grabbing: collect detailed service information for exploit research
7. Network Diagram: create visual map of discovered infrastructure
8. Report: prioritized list of hosts, services, and potential attack vectors`,
        title: 'Network Infrastructure Discovery & Mapping',
    },
    {
        text: `Conduct Active Directory security assessment for domain: {{DOMAIN_NAME}}

Action plan:
1. Initial Access: test password spraying, check for AS-REP roasting, look for Kerberoastable accounts
2. Domain Enumeration: enumerate users, groups, computers, GPOs, trust relationships
3. Privilege Escalation: identify misconfigured ACLs, check for exploitable group memberships, find delegation issues
4. Credential Harvesting: search for credentials in SYSVOL, check for password in AD attributes, dump NTDS.dit if possible
5. Lateral Movement: test pass-the-hash, pass-the-ticket, overpass-the-hash techniques
6. Persistence: identify opportunities for golden ticket, silver ticket, DCSync rights
7. Domain Admin Path: map attack path from current privileges to Domain Admin
8. Report: document attack chain, compromised accounts, security gaps in AD configuration`,
        title: 'Active Directory Penetration Test',
    },
    {
        text: `Perform comprehensive API security assessment: {{API_BASE_URL}}

Action plan:
1. API Discovery: identify all endpoints, HTTP methods, parameters
2. Authentication Testing: test broken authentication, token manipulation, JWT vulnerabilities
3. Authorization Testing: test broken object-level authorization (BOLA/IDOR), function-level authorization bypass
4. Input Validation: test injection attacks (SQL, NoSQL, Command, XXE), mass assignment vulnerabilities
5. Rate Limiting: test for absence of rate limiting, brute force protection
6. Business Logic: test for excessive data exposure, lack of resource limiting, unsafe consumption of APIs
7. Security Misconfiguration: check CORS policy, security headers, verbose error messages
8. GraphQL Specific (if applicable): test introspection, query depth limits, batching attacks
9. Report: document API vulnerabilities with curl/Postman proof-of-concepts`,
        title: 'API Security Testing',
    },
    {
        text: `Perform security audit of AWS infrastructure: {{AWS_ACCOUNT_ID or DOMAIN}}

Action plan:
1. Reconnaissance: identify S3 buckets, EC2 instances, public endpoints, enumerate services via DNS
2. S3 Security: test bucket permissions, public access, ACL misconfigurations, bucket policies
3. IAM Assessment: review roles, policies, check for overly permissive permissions, find unused credentials
4. EC2 Security: scan for open security groups, test instance metadata service (169.254.169.254), check IMDSv2
5. Network Security: review VPC configurations, security groups, NACLs, public subnets
6. Database Exposure: check RDS public accessibility, security groups, encryption settings
7. Lambda Functions: test for function URL exposure, environment variable leaks, IAM role permissions
8. CloudTrail & Logging: verify logging is enabled, check for security monitoring gaps
9. Report: prioritized cloud security findings with AWS-specific remediation steps`,
        title: 'Cloud Infrastructure Security Audit (AWS)',
    },
    {
        text: `Conduct WordPress security assessment: {{WORDPRESS_URL}}

Action plan:
1. Version Detection: identify WordPress core version, theme, and active plugins
2. Plugin Vulnerabilities: enumerate installed plugins, check for known CVEs using WPScan and Sploitus
3. Theme Vulnerabilities: identify theme version, search for known exploits
4. User Enumeration: enumerate valid usernames via REST API, author archives, login responses
5. Authentication Testing: test weak passwords, brute force protection, 2FA bypass
6. File Upload: test media upload restrictions, arbitrary file upload vulnerabilities
7. XML-RPC: check if enabled, test pingback SSRF, brute force amplification
8. SQL Injection: test search functionality, custom query parameters, plugin-specific inputs
9. XSS Testing: test comments, search, contact forms, custom fields
10. Configuration Issues: check wp-config.php exposure, directory listing, sensitive file access
11. Report: document WordPress-specific vulnerabilities with exploit steps`,
        title: 'WordPress Security Assessment',
    },
    {
        text: `Perform external attack surface assessment for organization: {{ORGANIZATION_NAME or DOMAIN}}

Action plan:
1. Asset Discovery: enumerate all domains, subdomains (subfinder, amass), IP ranges, ASN information
2. Certificate Transparency: search crt.sh for subdomains, identify forgotten assets
3. Port Scanning: scan all discovered assets for open ports and services
4. Web Application Fingerprinting: identify technologies, CMS, frameworks, server versions
5. Email Security: test SPF, DKIM, DMARC records, email spoofing potential
6. Cloud Asset Discovery: search for exposed S3 buckets, Azure blobs, exposed cloud databases
7. Sensitive Data Exposure: search GitHub, GitLab, Pastebin for leaked credentials, API keys
8. Third-Party Integrations: identify SaaS applications, API endpoints, partner integrations
9. Vulnerability Prioritization: identify internet-facing critical vulnerabilities
10. Report: comprehensive external attack surface map with risk-prioritized findings`,
        title: 'External Attack Surface Assessment',
    },
    {
        text: `Conduct internal network penetration test from position: {{INITIAL_ACCESS_LEVEL}}

Action plan:
1. Network Reconnaissance: ARP scanning, identify network segments, map internal infrastructure
2. Service Discovery: comprehensive port scanning of internal hosts, identify critical servers
3. SMB/NetBIOS Enumeration: test null sessions, enumerate shares, check for anonymous access
4. Credential Attacks: LLMNR/NBT-NS poisoning (Responder), relay attacks, password spraying
5. Vulnerability Exploitation: exploit unpatched services, test default credentials, known CVEs
6. Privilege Escalation: exploit local vulnerabilities, misconfigured services, weak permissions
7. Lateral Movement: pass-the-hash, token impersonation, exploit trust relationships
8. Data Exfiltration: identify sensitive data locations, test data loss prevention controls
9. Persistence: establish persistent access mechanisms
10. Report: document internal security posture, attack path visualization, remediation priorities`,
        title: 'Internal Network Penetration Test',
    },
    {
        text: `Perform security testing of mobile application backend API: {{API_URL}}

Action plan:
1. Traffic Interception: analyze mobile app traffic, extract API endpoints and authentication
2. Authentication Mechanisms: test OAuth flows, JWT implementation, refresh token handling, certificate pinning bypass
3. API Endpoint Testing: test all discovered endpoints for BOLA/IDOR, broken function-level authorization
4. Data Validation: test for injection attacks in API parameters, test file upload endpoints
5. Business Logic: test premium feature bypass, subscription validation, in-app purchase verification
6. Session Management: test token expiration, concurrent session handling, session fixation
7. Sensitive Data: check for PII exposure, excessive data in responses, hardcoded secrets
8. Rate Limiting: test brute force protection on login, API rate limits, account lockout
9. Deep Linking: test for deep link hijacking, intent redirection (Android), URL scheme abuse (iOS)
10. Report: mobile-specific vulnerabilities with mitigation recommendations`,
        title: 'Mobile Application Security Testing (API Backend)',
    },
    {
        text: `Assess DevOps infrastructure and CI/CD pipeline security: {{ORGANIZATION}}

Action plan:
1. Repository Security: scan GitHub/GitLab for exposed secrets, API keys, credentials in commit history
2. CI/CD Configuration: review Jenkins/GitLab CI/GitHub Actions configurations, test for injection in pipeline definitions
3. Container Security: scan Docker images for vulnerabilities, test for container escape, check image sources
4. Secrets Management: test secret storage (HashiCorp Vault, AWS Secrets Manager), check for hardcoded secrets
5. Access Control: review permissions on repositories, pipeline access, deployment keys, service accounts
6. Artifact Security: scan build artifacts, test artifact repository access controls (Nexus, Artifactory)
7. Kubernetes Security: review pod security policies, RBAC, network policies, exposed dashboards
8. Infrastructure as Code: review Terraform/Ansible for misconfigurations, overly permissive IAM roles
9. Monitoring & Logging: verify security logging, test log tampering, check for security monitoring gaps
10. Report: DevOps security findings with secure pipeline recommendations`,
        title: 'DevOps & CI/CD Pipeline Security',
    },
    {
        text: `Conduct database security assessment: {{DATABASE_TYPE}} at {{HOST:PORT}}

Action plan:
1. Access Testing: test for default credentials, weak passwords, anonymous access
2. Network Exposure: verify database should not be internet-accessible, check firewall rules
3. Authentication: test authentication mechanisms, user enumeration, password policies
4. Authorization: review user permissions, test for privilege escalation, check for excessive grants
5. Injection Testing: SQL injection in application layer, test stored procedures for injection
6. Configuration Review: check for dangerous configuration options (xp_cmdshell, LOAD DATA, file_priv)
7. Encryption: verify data-at-rest encryption, SSL/TLS for connections, check for sensitive data in plaintext
8. Backup Security: test backup file access, check backup encryption, verify backup restoration procedures
9. Audit Logging: verify audit logs enabled, test log tampering, check retention policies
10. Report: database-specific security findings with hardening recommendations`,
        title: 'Database Security Assessment',
    },
];

/**
 * How the editor writes, decided once per page visit:
 * - create / edit: administrators, straight into the shared library
 * - submit-new: a new template for review (fresh, duplicated, or a reviewed request resubmitted)
 * - propose: the author's proposed change to their own template
 * - edit-request: changing a request that is still waiting for review
 * - resubmit: proposing a reviewed change again
 * - view: read-only
 */
type EditorMode = 'create' | 'edit' | 'edit-request' | 'propose' | 'resubmit' | 'submit-new' | 'view';

interface EditorSession {
    /** Request revision the edit started from (edit-request) — the server refuses stale writes. */
    baseRevision: null | number;
    /** Template version the edit started from (edit) — the server refuses stale writes. */
    baseVersion: null | number;
    initialValues: FormValues;
    mode: EditorMode;
    /** Request being edited (edit-request) or resubmitted (submit-new / resubmit). */
    request: null | TemplateRequest;
    /** Title of the template being duplicated. */
    sourceTitle: null | string;
    /** Live template being edited or proposed against. */
    templateId: null | string;
}

type Resolution =
    | { kind: 'loading' }
    | { kind: 'not-found'; what: 'request' | 'template' }
    | { kind: 'ready'; session: EditorSession }
    | { kind: 'redirect'; to: string };

const DEFAULT_VALUES: FormValues = { targetTypes: [TargetType.General], text: '', title: '' };

const EMPTY_SESSION = {
    baseRevision: null,
    baseVersion: null,
    request: null,
    sourceTitle: null,
    templateId: null,
} satisfies Partial<EditorSession>;

const toFormValues = (content: { targetTypes: TargetType[]; text: string; title: string }): FormValues => ({
    targetTypes: content.targetTypes.length > 0 ? content.targetTypes : [TargetType.General],
    text: content.text,
    title: content.title,
});

const copyTitle = (title: string) => {
    const suffix = ' (copy)';

    return `${title.slice(0, TITLE_MAX_LENGTH - suffix.length)}${suffix}`;
};

// Modes that send content to a reviewer rather than writing to the library.
const REQUEST_MODES = new Set<EditorMode>(['edit-request', 'propose', 'resubmit', 'submit-new']);

// Modes that change something existing: saving requires an actual edit.
const REQUIRES_CHANGES = new Set<EditorMode>(['edit', 'edit-request', 'propose']);

const getHeading = (session: EditorSession): string => {
    switch (session.mode) {
        case 'create':
            return session.sourceTitle ? 'Duplicate template' : 'Create a new template';
        case 'edit':
            return 'Edit template';
        case 'edit-request':
            return session.request?.kind === TemplateRequestKind.Create ? 'Edit submission' : 'Edit proposed changes';
        case 'propose':
            return 'Propose changes';
        case 'resubmit':
            return 'Resubmit changes';
        case 'submit-new':
            if (session.request) {
                return 'Resubmit template';
            }

            return session.sourceTitle ? 'Duplicate template' : 'Submit a new template';
        case 'view':
            return 'View template';
    }
};

const TemplateEditor = () => {
    const navigate = useNavigate();
    const { requestId, templateId } = useParams<{ requestId?: string; templateId?: string }>();
    const [searchParams] = useSearchParams();
    const {
        canSubmitTemplates,
        createTemplate,
        currentUserId,
        getTemplateAccess,
        isLoadingRequests,
        isTemplateAdmin,
        pendingRequestByTemplateId,
        requests,
        submitRequest,
        updateRequest,
        updateTemplate,
    } = useTemplates();

    const { isMobile } = useBreakpoint();
    const isNew = templateId === 'new';
    const sourceTemplateId = isNew ? searchParams.get('from') : null;
    const [isAsideOpen, setIsAsideOpen] = useState(false);
    const [expandedPresetIndex, setExpandedPresetIndex] = useState<null | number>(null);
    const [isReplaceConfirmOpen, setIsReplaceConfirmOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [pendingPreset, setPendingPreset] = useState<null | { text: string; title: string }>(null);
    const [session, setSession] = useState<EditorSession | null>(null);

    // The request being edited / resubmitted (request routes only)
    const { data: requestData, loading: isLoadingRequest } = useFlowTemplateRequestQuery({
        skip: !requestId,
        variables: { requestId: requestId ?? '' },
    });
    const routeRequest = useMemo(
        () => (requestData?.flowTemplateRequest ? toTemplateRequest(requestData.flowTemplateRequest) : null),
        [requestData?.flowTemplateRequest],
    );

    // The live library template this page is about
    const liveTemplateId = requestId ? (routeRequest?.templateId ?? null) : isNew ? null : (templateId ?? null);
    const { data: templateData, loading: isLoadingTemplate } = useFlowTemplateQuery({
        skip: !liveTemplateId,
        variables: { templateId: liveTemplateId ?? '' },
    });
    const liveTemplate = useMemo(
        (): LibraryTemplate | null => (templateData?.flowTemplate ? toTemplate(templateData.flowTemplate) : null),
        [templateData?.flowTemplate],
    );

    // The template being duplicated (?from=)
    const { data: sourceData, loading: isLoadingSource } = useFlowTemplateQuery({
        skip: !sourceTemplateId,
        variables: { templateId: sourceTemplateId ?? '' },
    });

    const resolution = useMemo((): Resolution => {
        // Access depends on who the user is; wait for auth before deciding.
        if (!currentUserId) {
            return { kind: 'loading' };
        }

        if (requestId) {
            if (!routeRequest) {
                return isLoadingRequest ? { kind: 'loading' } : { kind: 'not-found', what: 'request' };
            }

            // Only the requester edits a request; reviewers review it.
            if (routeRequest.requesterId !== currentUserId) {
                return { kind: 'redirect', to: `/templates/requests/${routeRequest.id}` };
            }

            if (routeRequest.status === TemplateRequestStatus.Approved) {
                return {
                    kind: 'redirect',
                    to: routeRequest.templateId
                        ? `/templates/${routeRequest.templateId}`
                        : `/templates/requests/${routeRequest.id}`,
                };
            }

            const isPending = routeRequest.status === TemplateRequestStatus.Pending;
            const base: EditorSession = {
                ...EMPTY_SESSION,
                baseRevision: isPending ? routeRequest.revision : null,
                initialValues: toFormValues(routeRequest),
                mode: isPending ? 'edit-request' : 'submit-new',
                request: routeRequest,
            };

            if (routeRequest.kind === TemplateRequestKind.Create) {
                return { kind: 'ready', session: base };
            }

            if (!liveTemplate) {
                if (isLoadingTemplate) {
                    return { kind: 'loading' };
                }

                // The template this change was for is gone: it can only come back as a new template.
                return isPending
                    ? { kind: 'redirect', to: `/templates/requests/${routeRequest.id}` }
                    : { kind: 'ready', session: { ...base, mode: 'submit-new' } };
            }

            if (isPending) {
                return { kind: 'ready', session: { ...base, templateId: liveTemplate.id } };
            }

            if (isLoadingRequests) {
                return { kind: 'loading' };
            }

            // Only one open change per template: continue the newer one instead.
            const newer = pendingRequestByTemplateId.get(liveTemplate.id);

            if (newer) {
                return { kind: 'redirect', to: `/templates/requests/${newer.id}/edit` };
            }

            return { kind: 'ready', session: { ...base, mode: 'resubmit', templateId: liveTemplate.id } };
        }

        if (isNew) {
            if (!canSubmitTemplates) {
                return { kind: 'redirect', to: '/templates' };
            }

            const mode: EditorMode = isTemplateAdmin ? 'create' : 'submit-new';

            if (!sourceTemplateId) {
                return { kind: 'ready', session: { ...EMPTY_SESSION, initialValues: DEFAULT_VALUES, mode } };
            }

            const source = sourceData?.flowTemplate;

            if (!source) {
                return isLoadingSource ? { kind: 'loading' } : { kind: 'not-found', what: 'template' };
            }

            return {
                kind: 'ready',
                session: {
                    ...EMPTY_SESSION,
                    initialValues: toFormValues({ ...source, title: copyTitle(source.title) }),
                    mode,
                    sourceTitle: source.title,
                },
            };
        }

        if (!liveTemplate) {
            return isLoadingTemplate ? { kind: 'loading' } : { kind: 'not-found', what: 'template' };
        }

        const access = getTemplateAccess(liveTemplate);
        const fromTemplate: EditorSession = {
            ...EMPTY_SESSION,
            initialValues: toFormValues(liveTemplate),
            mode: 'view',
            templateId: liveTemplate.id,
        };

        if (access === 'edit') {
            return { kind: 'ready', session: { ...fromTemplate, baseVersion: liveTemplate.version, mode: 'edit' } };
        }

        if (access === 'view') {
            return { kind: 'ready', session: fromTemplate };
        }

        if (isLoadingRequests) {
            return { kind: 'loading' };
        }

        // The author already has a change waiting: keep editing that one.
        const pending = pendingRequestByTemplateId.get(liveTemplate.id);

        if (pending) {
            return {
                kind: 'ready',
                session: {
                    ...fromTemplate,
                    baseRevision: pending.revision,
                    initialValues: toFormValues(pending),
                    mode: 'edit-request',
                    request: pending,
                },
            };
        }

        return { kind: 'ready', session: { ...fromTemplate, mode: 'propose' } };
    }, [
        canSubmitTemplates,
        currentUserId,
        getTemplateAccess,
        isLoadingRequest,
        isLoadingRequests,
        isLoadingSource,
        isLoadingTemplate,
        isNew,
        isTemplateAdmin,
        liveTemplate,
        pendingRequestByTemplateId,
        requestId,
        routeRequest,
        sourceData?.flowTemplate,
        sourceTemplateId,
    ]);

    const form = useForm<FormValues>({
        defaultValues: DEFAULT_VALUES,
        mode: 'onChange',
        resolver: zodResolver(formSchema),
    });

    const { control, formState, getValues, handleSubmit: handleFormSubmit, reset, setValue } = form;

    // Freeze the session on first resolution: later cache updates (someone else
    // saving, a reviewer deciding) surface as notices instead of wiping the form.
    useEffect(() => {
        if (session || resolution.kind !== 'ready') {
            return;
        }

        setSession(resolution.session);
        reset(resolution.session.initialValues, { keepDefaultValues: false });
    }, [resolution, reset, session]);

    const mode = session?.mode ?? 'view';
    const isRequestMode = REQUEST_MODES.has(mode);

    // Live state of the request being edited, to notice decisions made meanwhile.
    const currentRequest = useMemo(() => {
        if (!session?.request) {
            return null;
        }

        return requests.find((request) => request.id === session.request?.id) ?? routeRequest ?? session.request;
    }, [requests, routeRequest, session?.request]);

    const isRequestDecided =
        mode === 'edit-request' && !!currentRequest && currentRequest.status !== TemplateRequestStatus.Pending;
    const isRequestChangedElsewhere =
        mode === 'edit-request' &&
        !isRequestDecided &&
        !!currentRequest &&
        session?.baseRevision != null &&
        currentRequest.revision !== session.baseRevision;
    const isTemplateGone = (mode === 'edit' || mode === 'propose') && !isLoadingTemplate && !liveTemplate;
    const isTemplateChangedElsewhere =
        mode === 'edit' &&
        !!liveTemplate &&
        session?.baseVersion != null &&
        liveTemplate.version !== session.baseVersion;

    const isBlocked = isRequestDecided || isTemplateGone;

    // Check if form has unsaved changes
    const hasUnsavedChanges = formState.isDirty;
    const isSubmitDisabled =
        isSaving || isBlocked || !formState.isValid || (REQUIRES_CHANGES.has(mode) && !hasUnsavedChanges);

    // Replace the form with the latest saved content (discarding local edits).
    const loadLatest = useCallback(() => {
        if (!session) {
            return;
        }

        if (session.mode === 'edit' && liveTemplate) {
            const initialValues = toFormValues(liveTemplate);
            setSession({ ...session, baseVersion: liveTemplate.version, initialValues });
            reset(initialValues, { keepDefaultValues: false });
        }

        if (session.mode === 'edit-request' && currentRequest) {
            const initialValues = toFormValues(currentRequest);
            setSession({ ...session, baseRevision: currentRequest.revision, initialValues, request: currentRequest });
            reset(initialValues, { keepDefaultValues: false });
        }
    }, [currentRequest, liveTemplate, reset, session]);

    const handleSubmit = async (values: FormValues) => {
        if (isSaving || !session) {
            return;
        }

        setIsSaving(true);

        try {
            switch (session.mode) {
                case 'create': {
                    await createTemplate(values);
                    navigate('/templates');
                    break;
                }

                case 'edit': {
                    if (!session.templateId) {
                        break;
                    }

                    const version = await updateTemplate(session.templateId, values, session.baseVersion ?? undefined);
                    setSession({ ...session, baseVersion: version, initialValues: values });
                    reset(values, { keepDefaultValues: false });
                    break;
                }

                case 'edit-request': {
                    if (!session.request || session.baseRevision == null) {
                        break;
                    }

                    const updated = await updateRequest({ ...session.request, revision: session.baseRevision }, values);
                    navigate(`/templates/requests/${updated.id}`);
                    break;
                }

                case 'propose':
                case 'resubmit':
                case 'submit-new': {
                    const submitted = await submitRequest(values, session.templateId ?? undefined);
                    navigate(`/templates/requests/${submitted.id}`);
                    break;
                }

                case 'view':
                    break;
            }
        } catch {
            // Error already handled in provider with toast
        } finally {
            setIsSaving(false);
        }
    };

    // Admins save with Enter (as before); a submission to a reviewer is
    // deliberate, so it takes Ctrl/Cmd+Enter and plain Enter adds a newline.
    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const { ctrlKey, key, metaKey, shiftKey } = event;
        const withModifier = ctrlKey || metaKey;

        if (key !== 'Enter' || shiftKey || (isRequestMode ? !withModifier : withModifier)) {
            return;
        }

        event.preventDefault();

        if (!isSubmitDisabled) {
            handleFormSubmit(handleSubmit)();
        }
    };

    const handleApplyPreset = useCallback(
        (preset: { text: string; title: string }) => {
            const current = getValues();
            const hasContent = (current.title?.trim().length ?? 0) > 0 || (current.text?.trim().length ?? 0) > 0;

            if (hasContent) {
                setPendingPreset(preset);
                setIsReplaceConfirmOpen(true);
            } else {
                setValue('title', preset.title, { shouldDirty: true, shouldValidate: true });
                setValue('text', preset.text, { shouldDirty: true, shouldValidate: true });
            }
        },
        [getValues, setValue],
    );

    const handleConfirmReplacePreset = useCallback(() => {
        if (pendingPreset) {
            setValue('title', pendingPreset.title, { shouldDirty: true, shouldValidate: true });
            setValue('text', pendingPreset.text, { shouldDirty: true, shouldValidate: true });
            setPendingPreset(null);
        }
    }, [pendingPreset, setValue]);

    const showSubmissionsCrumb = !!requestId && !isTemplateAdmin;
    const pageName = isNew
        ? sourceTemplateId
            ? 'Duplicate'
            : 'New template'
        : requestId
          ? (routeRequest?.title ?? 'Request')
          : (liveTemplate?.title ?? 'Template');

    const pageHeader = (
        <CommandBar
            actions={
                mode !== 'view' ? (
                    <Button
                        onClick={() => setIsAsideOpen((open) => !open)}
                        size="icon"
                        variant="ghost"
                    >
                        {isAsideOpen ? <PanelRightClose /> : <PanelRightOpen />}
                    </Button>
                ) : undefined
            }
            title={
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link to="/templates">Templates</Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        {showSubmissionsCrumb ? (
                            <>
                                <BreadcrumbItem>
                                    <BreadcrumbLink asChild>
                                        <Link to="/templates/submissions">My submissions</Link>
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                            </>
                        ) : null}
                        <BreadcrumbItem>
                            <BreadcrumbPage>{pageName}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            }
        />
    );

    const asideContent = useMemo(
        () => (
            <div className="flex h-full max-h-[calc(100dvh-3rem)] flex-col overflow-y-auto p-4">
                <h3 className="mb-3 block overline">Preset templates</h3>
                {PRESET_TEMPLATES.map((preset, index) => (
                    <Collapsible
                        key={index}
                        onOpenChange={(open) => setExpandedPresetIndex(open ? index : null)}
                        open={expandedPresetIndex === index}
                    >
                        <Card>
                            <div className="flex">
                                <Button
                                    className={cn(
                                        'h-auto min-w-0 flex-1 justify-start rounded-none rounded-tl-[0.6875rem] px-3 py-2 text-left text-start',
                                        expandedPresetIndex !== index ? 'rounded-bl-[0.6875rem]' : 'whitespace-normal',
                                    )}
                                    onClick={() => handleApplyPreset(preset)}
                                    variant="ghost"
                                >
                                    <span className={cn(expandedPresetIndex !== index && 'truncate')}>
                                        {preset.title}
                                    </span>
                                </Button>
                                <CollapsibleTrigger asChild>
                                    <Button
                                        className={cn(
                                            'h-auto shrink-0 rounded-none rounded-tr-[0.6875rem] border-l px-2 py-2',
                                            expandedPresetIndex !== index && 'rounded-br-[0.6875rem]',
                                        )}
                                        variant="ghost"
                                    >
                                        <ChevronDown
                                            className={cn(
                                                'transition-transform',
                                                expandedPresetIndex === index && 'rotate-180',
                                            )}
                                        />
                                    </Button>
                                </CollapsibleTrigger>
                            </div>
                            <CollapsibleContent>
                                <CardContent className="border-t px-3 py-2">
                                    <p className="text-muted-foreground text-sm break-words whitespace-pre-wrap">
                                        {preset.text}
                                    </p>
                                </CardContent>
                            </CollapsibleContent>
                        </Card>
                    </Collapsible>
                ))}
            </div>
        ),
        [expandedPresetIndex, handleApplyPreset],
    );

    const aside = useMemo(
        () =>
            isMobile ? (
                <Sheet
                    onOpenChange={setIsAsideOpen}
                    open={isAsideOpen}
                >
                    <SheetContent
                        className="w-full max-w-[min(20rem,100vw)]"
                        side="right"
                    >
                        {asideContent}
                    </SheetContent>
                </Sheet>
            ) : (
                <aside
                    className={cn(
                        'bg-background shrink-0 overflow-hidden transition-[width] duration-200',
                        isAsideOpen ? 'w-80 border-l sm:w-96' : 'w-0',
                    )}
                >
                    {isAsideOpen ? <div className="h-full w-80 sm:w-96">{asideContent}</div> : null}
                </aside>
            ),
        [isMobile, isAsideOpen, asideContent],
    );

    const requestLink = (request: TemplateRequest, label = 'View request') => (
        <Button
            asChild
            size="sm"
            variant="outline"
        >
            <Link to={`/templates/requests/${request.id}`}>{label}</Link>
        </Button>
    );

    const loadLatestButton = (
        <Button
            onClick={loadLatest}
            size="sm"
            variant="outline"
        >
            Load latest
        </Button>
    );

    // Where this template or request stands, shown above the form.
    const renderNotices = (): ReactNode[] => {
        if (!session) {
            return [];
        }

        const notices: ReactNode[] = [];
        const reviewed = session.request;
        const reviewer = reviewed?.reviewerName ?? 'an administrator';

        if (isRequestDecided && currentRequest) {
            notices.push(
                <TemplateNotice
                    action={requestLink(currentRequest)}
                    key="decided"
                    title={`This request was just reviewed: ${getRequestStatusLabel(currentRequest.status).toLowerCase()}`}
                    tone="danger"
                >
                    Your unsaved edits are kept here, but this request can no longer be changed.
                </TemplateNotice>,
            );
        } else if (isRequestChangedElsewhere) {
            notices.push(
                <TemplateNotice
                    action={loadLatestButton}
                    key="changed-request"
                    title="This request was changed in another window"
                    tone="warning"
                >
                    Load the latest version before saving, or your save will be refused.
                </TemplateNotice>,
            );
        }

        if (isTemplateGone) {
            notices.push(
                <TemplateNotice
                    key="gone"
                    title="This template was deleted"
                    tone="danger"
                >
                    It is no longer in the library and cannot be changed.
                </TemplateNotice>,
            );
        } else if (isTemplateChangedElsewhere) {
            notices.push(
                <TemplateNotice
                    action={loadLatestButton}
                    key="changed-template"
                    title="Someone else changed this template since you opened it"
                    tone="warning"
                >
                    Load the latest version before saving, or your save will be refused.
                </TemplateNotice>,
            );
        }

        switch (session.mode) {
            case 'create':
            case 'view':
                break;

            case 'edit': {
                const pending = session.templateId ? pendingRequestByTemplateId.get(session.templateId) : undefined;

                if (pending) {
                    notices.push(
                        <TemplateNotice
                            action={requestLink(pending, 'Review')}
                            key="pending"
                            title={`${pending.requesterName} proposed changes to this template`}
                        >
                            Editing directly does not resolve that request; review it separately.
                        </TemplateNotice>,
                    );
                }

                break;
            }

            case 'edit-request':
                if (!isRequestDecided && reviewed) {
                    notices.push(
                        <TemplateNotice
                            action={requestLink(reviewed)}
                            key="mode"
                            title={`Waiting for review · submitted ${formatDate(reviewed.createdAt)}`}
                        >
                            {reviewed.kind === TemplateRequestKind.Create
                                ? 'This template is not in the library yet. Saving updates your submission.'
                                : 'The current version stays live until an administrator approves your changes. Saving updates your request.'}
                        </TemplateNotice>,
                    );
                }

                break;

            case 'propose':
                notices.push(
                    <TemplateNotice
                        key="mode"
                        title="Changes are reviewed before they go live"
                    >
                        An administrator reviews your changes. The current version stays live until they are approved.
                    </TemplateNotice>,
                );
                break;

            case 'resubmit':
            case 'submit-new':
                if (reviewed?.status === TemplateRequestStatus.Rejected) {
                    notices.push(
                        <TemplateNotice
                            key="mode"
                            title={`Changes requested by ${reviewer}`}
                            tone="danger"
                        >
                            {reviewed.reviewNote ?? 'No note was left.'}
                        </TemplateNotice>,
                    );
                } else if (reviewed?.status === TemplateRequestStatus.Closed) {
                    notices.push(
                        <TemplateNotice
                            key="mode"
                            title="This request was closed"
                            tone="warning"
                        >
                            {reviewed.reviewNote ?? 'It can no longer be approved.'}
                        </TemplateNotice>,
                    );
                }

                if (reviewed?.kind === TemplateRequestKind.Update && session.mode === 'submit-new') {
                    notices.push(
                        <TemplateNotice
                            key="orphan"
                            title="The original template no longer exists"
                            tone="warning"
                        >
                            Submitting proposes this as a new template.
                        </TemplateNotice>,
                    );
                }

                notices.push(
                    <TemplateNotice
                        key="review"
                        title="Reviewed before publishing"
                    >
                        {session.mode === 'resubmit'
                            ? 'An administrator reviews your changes. The current version stays live until they are approved.'
                            : 'An administrator reviews new templates before they are added to the library.'}
                    </TemplateNotice>,
                );
                break;
        }

        return notices;
    };

    if (resolution.kind === 'redirect' && !session) {
        return (
            <Navigate
                replace
                to={resolution.to}
            />
        );
    }

    // Show loading spinner when fetching template data
    if (!session && resolution.kind !== 'not-found') {
        return (
            <>
                {pageHeader}
                <div className="flex min-h-[calc(100dvh-3rem)] items-center justify-center">
                    <Spinner />
                </div>
            </>
        );
    }

    // Handle template / request not found
    if (!session) {
        const what = resolution.kind === 'not-found' ? resolution.what : 'template';

        return (
            <>
                {pageHeader}
                <div className="flex min-h-[calc(100dvh-3rem)] items-center justify-center p-4">
                    <Card className="w-full max-w-2xl">
                        <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
                            <h2 className="text-xl font-semibold">
                                {what === 'request' ? 'Request not found' : 'Template not found'}
                            </h2>
                            <p className="text-muted-foreground">The {what} you are looking for does not exist.</p>
                            <Button onClick={() => navigate('/templates')}>Back to Templates</Button>
                        </CardContent>
                    </Card>
                </div>
            </>
        );
    }

    const notices = renderNotices();

    if (session.mode === 'view') {
        const viewed = liveTemplate;

        return (
            <>
                {pageHeader}
                <div className="flex min-h-[calc(100dvh-3rem)] items-center justify-center p-4">
                    <Card className="w-full max-w-2xl">
                        <CardContent className="flex flex-col gap-4 pt-6">
                            <div className="text-center">
                                <h1 className="text-2xl font-semibold tracking-tight">{viewed?.title ?? 'Template'}</h1>
                                {viewed?.targetTypes.length ? (
                                    <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                                        {viewed.targetTypes.map((type) => (
                                            <TargetTypeChip
                                                key={type}
                                                type={type}
                                            />
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                            <TemplateNotice title="Read-only">
                                {viewed?.systemOwned
                                    ? 'Built-in templates are managed by administrators.'
                                    : 'This template belongs to someone else, so you can view it but not change it.'}
                                {canSubmitTemplates ? ' Duplicate it to submit your own version.' : null}
                            </TemplateNotice>
                            <div className="bg-muted/40 max-h-[60vh] overflow-y-auto rounded-md border p-3 text-sm leading-relaxed break-words whitespace-pre-wrap">
                                {viewed?.text}
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button
                                    onClick={() => navigate('/templates')}
                                    variant="outline"
                                >
                                    Back to library
                                </Button>
                                {canSubmitTemplates && viewed ? (
                                    <Button onClick={() => navigate(`/templates/new?from=${viewed.id}`)}>
                                        <Copy />
                                        Duplicate
                                    </Button>
                                ) : null}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </>
        );
    }

    return (
        <>
            {pageHeader}
            <div className="flex min-h-[calc(100dvh-3rem)]">
                <div className="flex min-w-0 flex-1 items-center justify-center p-4">
                    <Card className="w-full max-w-2xl">
                        <CardContent className="flex flex-col gap-4 pt-6">
                            <div className="text-center">
                                <h1 className="text-2xl font-semibold tracking-tight">{getHeading(session)}</h1>
                                <p className="text-muted-foreground mt-2">
                                    Add title and content for your template or use a
                                    <Button
                                        className="h-auto px-1.5 py-0 text-base"
                                        onClick={() => setIsAsideOpen((open) => !open)}
                                        variant="link"
                                    >
                                        Preset template
                                    </Button>
                                </p>
                            </div>
                            {notices.length ? <div className="flex flex-col gap-2">{notices}</div> : null}
                            <Form {...form}>
                                <form
                                    className="flex flex-col gap-4"
                                    onSubmit={handleFormSubmit(handleSubmit)}
                                >
                                    <FormField
                                        control={control}
                                        name="title"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="field-label">Title</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        autoFocus={isNew}
                                                        disabled={isSaving}
                                                        placeholder="Title"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={control}
                                        name="targetTypes"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="field-label">Target types</FormLabel>
                                                <FormControl>
                                                    <TargetTypePicker
                                                        disabled={isSaving}
                                                        onChange={field.onChange}
                                                        value={field.value}
                                                    />
                                                </FormControl>
                                                <FormDescription className="field-hint">
                                                    Tag this template with the scan types it applies to.
                                                </FormDescription>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={control}
                                        name="text"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="field-label">Content</FormLabel>
                                                <FormControl>
                                                    <InputGroup className="block">
                                                        <InputGroupTextareaAutosize
                                                            {...field}
                                                            className="min-h-0"
                                                            disabled={isSaving}
                                                            maxRows={9}
                                                            minRows={isRequestMode ? 3 : 1}
                                                            onKeyDown={handleKeyDown}
                                                            placeholder="Content"
                                                        />
                                                        <InputGroupAddon align="block-end">
                                                            {isRequestMode ? (
                                                                <>
                                                                    <span className="text-muted-foreground text-[11px]">
                                                                        Ctrl/⌘ + Enter to submit
                                                                    </span>
                                                                    <InputGroupButton
                                                                        className="ml-auto"
                                                                        disabled={isSubmitDisabled}
                                                                        size="xs"
                                                                        type="submit"
                                                                        variant="default"
                                                                    >
                                                                        {isSaving ? (
                                                                            <Spinner variant="circle" />
                                                                        ) : (
                                                                            <Send />
                                                                        )}
                                                                        {mode === 'edit-request'
                                                                            ? 'Update request'
                                                                            : 'Submit for review'}
                                                                    </InputGroupButton>
                                                                </>
                                                            ) : (
                                                                <InputGroupButton
                                                                    className="ml-auto"
                                                                    disabled={isSubmitDisabled}
                                                                    size="icon-xs"
                                                                    type="submit"
                                                                    variant="default"
                                                                >
                                                                    {isSaving ? <Spinner variant="circle" /> : <Save />}
                                                                </InputGroupButton>
                                                            )}
                                                        </InputGroupAddon>
                                                    </InputGroup>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </div>
                {aside}
            </div>
            <ConfirmationDialog
                confirmIcon={<FileSymlink />}
                confirmText="Replace"
                confirmVariant="default"
                description="Current form has content. Replace with the selected preset?"
                handleConfirm={handleConfirmReplacePreset}
                handleOpenChange={(open) => {
                    if (!open) {
                        setPendingPreset(null);
                    }

                    setIsReplaceConfirmOpen(open);
                }}
                isOpen={isReplaceConfirmOpen}
                title="Replace content?"
            />
        </>
    );
};

// Remount per URL so each visit resolves its own editing session.
const Template = () => {
    const location = useLocation();

    return <TemplateEditor key={location.pathname + location.search} />;
};

export default Template;
