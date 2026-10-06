// New "Scan" engagement wizard, wired to the createScan mutation. It is a
// separate sidebar entry from the classic Scans (domains) form and does not
// change it. Flow: target + kind -> scope/box (+cloud provider) -> templates by
// type with per-template Automatic/Assistant -> credentials (internal/grey only)
// -> review -> create. The login/access validation is intentionally NOT here; it
// runs later in the flow/terminal (see the feasibility doc).
import {
    ArrowLeft,
    ArrowRight,
    Box,
    Braces,
    Check,
    Cloud,
    Eye,
    EyeOff,
    Globe,
    Lock,
    Network,
    Server,
    ShieldAlert,
    ShieldCheck,
    Smartphone,
    Target,
    Zap,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import CommandBar from '@/components/layouts/command-bar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import ScanInitializing from '@/features/flows/scan-initializing';
import TargetStatus from '@/features/flows/target-status';
import {
    type CreateScanInput,
    ScanBox,
    ScanCredentialKind,
    ScanRunMode,
    ScanScope,
    TargetType,
    useCreateScanMutation,
} from '@/graphql/types';
import { useScanStage } from '@/hooks/use-scan-stage';
import { canAdvanceTarget, useTargetCheck } from '@/hooks/use-target-check';
import { type CredentialBranch, getCredentialErrors, stripBearer } from '@/lib/credential-validation';
import { getTargetTypeLabel } from '@/lib/target-type-colors';
import { cn } from '@/lib/utils';
import { useTemplates } from '@/providers/templates-provider';

type CloudProvider = TargetType.Aws | TargetType.Azure | TargetType.Gcp;
type StepKey = 'credentials' | 'review' | 'scope' | 'target' | 'templates';
type TargetClass = 'cloud' | 'web';
type WebCredType = 'form' | 'token';

// Glyph used for a target type inside template cards / the summary dossier.
const TARGET_TYPE_ICON: Record<TargetType, React.ComponentType<{ className?: string }>> = {
    [TargetType.Api]: Braces,
    [TargetType.Aws]: Cloud,
    [TargetType.Azure]: Cloud,
    [TargetType.Cloud]: Cloud,
    [TargetType.Gcp]: Cloud,
    [TargetType.General]: Box,
    [TargetType.MobileBackend]: Smartphone,
    [TargetType.Network]: Network,
    [TargetType.WebApp]: Globe,
};

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// Selection pip shown on the right of a .choice card.
const Pip = ({ selected }: { selected: boolean }) =>
    selected ? (
        <span className="bg-primary text-primary-foreground flex size-[22px] shrink-0 items-center justify-center self-center rounded-full">
            <Check className="size-3.5" />
        </span>
    ) : (
        <span className="border-border-strong size-[22px] shrink-0 self-center rounded-full border" />
    );

const ChoiceCard = ({
    description,
    icon: Icon,
    onClick,
    selected,
    showPip = true,
    tag,
    title,
}: {
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
    selected: boolean;
    showPip?: boolean;
    tag?: string;
    title: string;
}) => (
    <button
        className={cn('choice w-full flex-1 text-left', selected && 'sel')}
        onClick={onClick}
        type="button"
    >
        <span className="ci">
            <Icon className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
                <span className="ct">{title}</span>
                {tag ? <span className="badge badge-sys">{tag}</span> : null}
            </span>
            <span className="cd block">{description}</span>
        </span>
        {showPip ? <Pip selected={selected} /> : null}
    </button>
);

const Field = ({
    children,
    error,
    hint,
    label,
}: {
    children: React.ReactNode;
    error?: string;
    hint?: string;
    label: string;
}) => (
    <div>
        <label className="field-label">{label}</label>
        {children}
        {error ? (
            <p
                className="field-error"
                role="alert"
            >
                {error}
            </p>
        ) : hint ? (
            <p className="field-hint">{hint}</p>
        ) : null}
    </div>
);

// Step-form heading: mono overline + title + supporting copy.
const StepHead = ({ desc, over, title }: { desc: string; over: string; title: string }) => (
    <div className="mb-5">
        <div className="mb-1.5 overline">{over}</div>
        <h3 className="mb-1.5 text-[17px] font-semibold">{title}</h3>
        <p className="text-muted-foreground max-w-[58ch] text-[13px] leading-relaxed">{desc}</p>
    </div>
);

const SpRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="sp-row">
        <span className="k">{label}</span>
        <span className="v">{value}</span>
    </div>
);

const NewEngagement = () => {
    const navigate = useNavigate();
    const { templates } = useTemplates();
    const [createScan] = useCreateScanMutation();

    const [step, setStep] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // While createScan is in flight (and we navigate to the new scan), show the animated
    // "your scan is starting" experience instead of a bare button spinner.
    const createStage = useScanStage(undefined, isLoading);
    // NOTE: useTargetCheck(name) does NOT belong here — it sits below the state
    // declarations. Placed here it reads `name` before its `const`, which throws
    // "Cannot access 'name' before initialization" and blanks the whole page.
    const [showSecret, setShowSecret] = useState(false);

    const [name, setName] = useState('');
    const [targetClass, setTargetClass] = useState<null | TargetClass>(null);
    const [cloudProvider, setCloudProvider] = useState<CloudProvider | null>(null);
    const [scope, setScope] = useState<null | ScanScope>(null);
    const [box, setBox] = useState<null | ScanBox>(null);
    const [selected, setSelected] = useState<Record<string, ScanRunMode>>({});
    const [webCredType, setWebCredType] = useState<null | WebCredType>(null);
    const [creds, setCreds] = useState({
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
    });

    const setCred = (key: keyof typeof creds, value: string) => setCreds((prev) => ({ ...prev, [key]: value }));

    // Live verdict for the Target field: format checked in the browser, then
    // the backend's checkTarget, which resolves and probes the target. Declared
    // after `name` so it reads the state rather than its temporal dead zone.
    const targetCheck = useTargetCheck(name);
    const targetValid = canAdvanceTarget(targetCheck);

    // Track which credential fields the user has left, so format errors only
    // appear after a field has been touched rather than while first typing.
    const [touched, setTouched] = useState<Partial<Record<keyof typeof creds, boolean>>>({});
    const touch = (key: keyof typeof creds) => setTouched((prev) => ({ ...prev, [key]: true }));

    // The concrete target type that drives template filtering + the scan record.
    // Cloud maps to the single TargetType.Cloud regardless of which provider
    // (AWS/Azure/GCP) the user picked; the provider only selects the credential kind.
    const targetType: null | TargetType =
        targetClass === 'cloud' ? TargetType.Cloud : targetClass === 'web' ? TargetType.WebApp : null;

    // Credentials only for internal (cloud) / grey box (web).
    const needsCredentials =
        (targetClass === 'cloud' && scope === ScanScope.Internal) || (targetClass === 'web' && box === ScanBox.Grey);

    // Which credential form is active, and the per-field format errors for it.
    const credBranch: CredentialBranch | null =
        targetClass === 'cloud' && cloudProvider === TargetType.Aws
            ? 'aws'
            : targetClass === 'cloud' && cloudProvider === TargetType.Gcp
              ? 'gcp'
              : targetClass === 'cloud' && cloudProvider === TargetType.Azure
                ? 'azure'
                : targetClass === 'web' && webCredType === 'token'
                  ? 'web-token'
                  : targetClass === 'web' && webCredType === 'form'
                    ? 'web-form'
                    : null;

    const credErrors = useMemo(() => (credBranch ? getCredentialErrors(credBranch, creds) : {}), [credBranch, creds]);

    // Credentials are valid once the active branch has no missing/malformed
    // fields; when no credentials are required the step is trivially satisfied.
    const credValid = !needsCredentials || (credBranch !== null && Object.keys(credErrors).length === 0);

    // Error shown for a field only after it has been touched (blurred).
    const errFor = (key: keyof typeof creds): string | undefined => (touched[key] ? credErrors[key] : undefined);

    const availableTemplates = useMemo(() => {
        if (targetClass === 'cloud' && cloudProvider) {
            // Show templates tagged for the chosen provider (AWS/Azure/GCP)
            // plus generic Cloud templates that apply to any provider.
            return templates.filter(
                (t) => t.targetTypes.includes(cloudProvider) || t.targetTypes.includes(TargetType.Cloud),
            );
        }

        if (targetClass === 'web') {
            return templates.filter(
                (t) => t.targetTypes.includes(TargetType.WebApp) || t.targetTypes.includes(TargetType.Api),
            );
        }

        return [];
    }, [templates, targetClass, cloudProvider]);

    const selectedIds = Object.keys(selected);

    const stepKeys = useMemo<StepKey[]>(() => {
        const keys: StepKey[] = ['target', 'scope', 'templates'];

        if (needsCredentials) {
            keys.push('credentials');
        }

        keys.push('review');

        return keys;
    }, [needsCredentials]);

    const currentKey = stepKeys[Math.min(step, stepKeys.length - 1)];

    const resetBranch = () => {
        setCloudProvider(null);
        setScope(null);
        setBox(null);
        setSelected({});
        setWebCredType(null);
    };

    const toggleTemplate = (id: string) =>
        setSelected((prev) => {
            const next = { ...prev };

            if (next[id]) {
                delete next[id];
            } else {
                next[id] = ScanRunMode.Automatic;
            }

            return next;
        });

    const canAdvance = useMemo(() => {
        switch (currentKey) {
            case 'credentials':
                // Require the active branch's credential fields to be present AND
                // correctly formatted, so we never store/deliver a malformed
                // credential. credValid is false while no branch is chosen.
                return credValid && credBranch !== null;
            case 'scope':
                if (targetClass === 'cloud') {
                    return !!cloudProvider && !!scope;
                }

                return !!box;
            case 'target':
                // The target must be confirmed, not merely non-empty, so a
                // typo or a dead host cannot reach template selection.
                return !!name.trim() && !!targetClass && targetValid;
            case 'templates':
                return selectedIds.length > 0;
            default:
                return true;
        }
    }, [
        currentKey,
        name,
        targetClass,
        targetValid,
        cloudProvider,
        scope,
        box,
        selectedIds.length,
        credValid,
        credBranch,
    ]);

    const buildCredential = (): CreateScanInput['credential'] => {
        if (!needsCredentials) {
            return undefined;
        }

        if (targetClass === 'cloud' && cloudProvider === TargetType.Aws) {
            return {
                kind: ScanCredentialKind.CloudKeys,
                value: JSON.stringify({
                    access_key_id: creds.accessKeyId,
                    provider: 'aws',
                    region: creds.region,
                    secret_access_key: creds.secretAccessKey,
                }),
            };
        }

        if (targetClass === 'cloud' && cloudProvider === TargetType.Gcp) {
            return {
                kind: ScanCredentialKind.CloudKeys,
                value: JSON.stringify({ provider: 'gcp', service_account_json: creds.serviceAccountJson }),
            };
        }

        if (targetClass === 'cloud' && cloudProvider === TargetType.Azure) {
            return {
                kind: ScanCredentialKind.CloudKeys,
                value: JSON.stringify({
                    app_id: creds.appId,
                    client_secret: creds.clientSecret,
                    provider: 'azure',
                    tenant: creds.tenant,
                }),
            };
        }

        if (targetClass === 'web' && webCredType === 'token') {
            return {
                kind: ScanCredentialKind.WebToken,
                value: JSON.stringify({ protected_url: creds.protectedUrl.trim(), token: stripBearer(creds.token) }),
            };
        }

        if (targetClass === 'web' && webCredType === 'form') {
            return {
                kind: ScanCredentialKind.EmailPassword,
                value: JSON.stringify({ email: creds.email, login_url: creds.loginUrl, password: creds.password }),
            };
        }

        return undefined;
    };

    const onSubmit = async () => {
        if (isLoading || !targetType) {
            return;
        }

        setIsLoading(true);

        try {
            const { data } = await createScan({
                variables: {
                    input: {
                        box: targetClass === 'web' ? box : undefined,
                        credential: buildCredential(),
                        name: name.trim(),
                        scope: targetClass === 'cloud' ? scope : undefined,
                        targetType,
                        templates: selectedIds.map((id) => ({
                            runMode: selected[id] ?? ScanRunMode.Automatic,
                            templateId: id,
                        })),
                    },
                },
            });
            const created = data?.createScan;

            if (created) {
                navigate(`/scans/${created.id}`);
            }
        } catch (error) {
            toast.error('Failed to create scan', {
                description: error instanceof Error ? error.message : 'An error occurred while creating the scan',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const isLast = step === stepKeys.length - 1;

    // --- presentational derivations for the summary dossier / launch CTA ------
    const currentNum = Math.min(step, stepKeys.length - 1) + 1;

    const scopeValid = targetClass === 'cloud' ? !!cloudProvider && !!scope : targetClass === 'web' ? !!box : false;

    // Credentials are complete when the active branch validates (or none are
    // required). Uses the same format checks as the per-field inline errors.
    const credComplete = credValid && (!needsCredentials || credBranch !== null);

    const fullValid =
        !!name.trim() && !!targetClass && targetValid && scopeValid && selectedIds.length > 0 && credComplete;

    const runModeLabel = (() => {
        const modes = selectedIds.map((id) => selected[id]);

        if (!modes.length) {
            return '—';
        }

        if (modes.every((m) => m === ScanRunMode.Automatic)) {
            return 'Automatic';
        }

        if (modes.every((m) => m === ScanRunMode.Assistant)) {
            return 'Assistant';
        }

        return 'Mixed';
    })();

    const summaryGlyph =
        targetClass === 'cloud' ? (
            <Cloud className="size-4" />
        ) : targetClass === 'web' ? (
            <Globe className="size-4" />
        ) : (
            <Box className="size-4" />
        );

    return (
        <>
            <CommandBar
                ctx={
                    <>
                        Step{' '}
                        <span className="text-foreground font-semibold">{Math.min(step, stepKeys.length - 1) + 1}</span>{' '}
                        / {stepKeys.length}
                        <span className="text-muted-foreground/50">·</span>
                        <span className="capitalize">{currentKey}</span>
                    </>
                }
                title="New scan"
            />

            <div className="p-6">
                {isLoading ? (
                    <Card className="mx-auto w-full max-w-3xl">
                        <CardContent className="pt-6">
                            <ScanInitializing
                                className="py-10"
                                stageIndex={createStage}
                            />
                        </CardContent>
                    </Card>
                ) : (
                    <div className="mx-auto w-full max-w-5xl">
                        {/* Stepper header + live target chip */}
                        <div className="border-border mb-6 flex flex-wrap items-center gap-4 border-b pb-5">
                            <div className="stepper">
                                {stepKeys.map((key, index) => {
                                    const completed = index < step;
                                    const active = index === step;
                                    const jumpable = index <= step;

                                    return (
                                        <div
                                            className="flex items-center"
                                            key={key}
                                        >
                                            <button
                                                className={cn('step', completed && 'done', active && 'current')}
                                                disabled={!jumpable}
                                                onClick={() => jumpable && setStep(index)}
                                                style={jumpable ? { cursor: 'pointer' } : undefined}
                                                type="button"
                                            >
                                                <span className="n">
                                                    {completed ? <Check className="size-3.5" /> : index + 1}
                                                </span>
                                                <span className="lbl capitalize">{key}</span>
                                            </button>
                                            {index < stepKeys.length - 1 ? <span className="step-line" /> : null}
                                        </div>
                                    );
                                })}
                            </div>
                            <span className="ml-auto">
                                <span className="chip">
                                    <Target className="size-[13px]" />
                                    {name.trim() || 'New target'}
                                </span>
                            </span>
                        </div>

                        {/* Two-column: step form (left) + summary dossier (right).
                            On the final review step the dossier is hidden and the review
                            card becomes a single, centred source of truth. */}
                        <div
                            className={cn(
                                'grid items-start gap-6',
                                isLast ? 'mx-auto max-w-2xl' : 'lg:grid-cols-[1fr_340px]',
                            )}
                        >
                            <div>
                                {/* Step: target + kind */}
                                {currentKey === 'target' ? (
                                    <div className="flex flex-col gap-5">
                                        <StepHead
                                            desc="Enter the target and choose its type. This filters the test templates down to the ones that apply."
                                            over={`Step ${currentNum} · Target`}
                                            title="What are we assessing?"
                                        />
                                        <Field
                                            hint={
                                                targetCheck.kind === 'idle'
                                                    ? 'A domain, host, URL, or cloud account/asset identifier.'
                                                    : undefined
                                            }
                                            label="Target"
                                        >
                                            <Input
                                                aria-invalid={
                                                    targetCheck.kind === 'format-error' ||
                                                    (targetCheck.kind === 'checked' && !targetCheck.result.ok)
                                                }
                                                autoFocus
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="acme.com"
                                                value={name}
                                            />
                                            <TargetStatus state={targetCheck} />
                                        </Field>
                                        <div className="flex flex-col gap-2">
                                            <label className="field-label">What type of target is it?</label>
                                            <div className="flex flex-col gap-3 sm:flex-row">
                                                <ChoiceCard
                                                    description="GCP, AWS, or Azure infrastructure."
                                                    icon={Cloud}
                                                    onClick={() => {
                                                        setTargetClass('cloud');
                                                        resetBranch();
                                                    }}
                                                    selected={targetClass === 'cloud'}
                                                    title="Cloud Infrastructure"
                                                />
                                                <ChoiceCard
                                                    description="A single web application or API surface."
                                                    icon={Globe}
                                                    onClick={() => {
                                                        setTargetClass('web');
                                                        resetBranch();
                                                    }}
                                                    selected={targetClass === 'web'}
                                                    title="Web Application / API"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : null}

                                {/* Step: scope / box */}
                                {currentKey === 'scope' && targetClass === 'cloud' ? (
                                    <div className="flex flex-col gap-5">
                                        <StepHead
                                            desc="Choose the cloud provider and whether the agents work from outside or with authenticated access."
                                            over={`Step ${currentNum} · Scope`}
                                            title="Provider & scope"
                                        />
                                        <div className="flex flex-col gap-2">
                                            <label className="field-label">Cloud provider</label>
                                            <div className="flex flex-col gap-3 sm:flex-row">
                                                {[TargetType.Aws, TargetType.Gcp, TargetType.Azure].map((p) => (
                                                    <ChoiceCard
                                                        description={getTargetTypeLabel(p)}
                                                        icon={Server}
                                                        key={p}
                                                        onClick={() => {
                                                            setCloudProvider(p as CloudProvider);
                                                            // templates are provider-specific; clear stale selections
                                                            setSelected({});
                                                        }}
                                                        selected={cloudProvider === p}
                                                        showPip={false}
                                                        title={p.toUpperCase()}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="field-label">Internal or external scope?</label>
                                            <div className="flex flex-col gap-3 sm:flex-row">
                                                <ChoiceCard
                                                    description="Test as an outside attacker. No credentials needed."
                                                    icon={ShieldAlert}
                                                    onClick={() => setScope(ScanScope.External)}
                                                    selected={scope === ScanScope.External}
                                                    title="External"
                                                />
                                                <ChoiceCard
                                                    description="Agent acts as a logged-in member using account credentials."
                                                    icon={ShieldCheck}
                                                    onClick={() => setScope(ScanScope.Internal)}
                                                    selected={scope === ScanScope.Internal}
                                                    tag="credentials"
                                                    title="Internal"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : null}

                                {currentKey === 'scope' && targetClass === 'web' ? (
                                    <div className="flex flex-col gap-5">
                                        <StepHead
                                            desc="Grey box tests with credentials you supply; black box is zero-knowledge, like a real attacker."
                                            over={`Step ${currentNum} · Scope`}
                                            title="Assessment mode"
                                        />
                                        <div className="flex flex-col gap-2">
                                            <label className="field-label">Grey box or black box?</label>
                                            <div className="flex flex-col gap-3 sm:flex-row">
                                                <ChoiceCard
                                                    description="Partial access is given. AI Pentest logs in with supplied credentials."
                                                    icon={ShieldCheck}
                                                    onClick={() => setBox(ScanBox.Grey)}
                                                    selected={box === ScanBox.Grey}
                                                    tag="credentials"
                                                    title="Grey box"
                                                />
                                                <ChoiceCard
                                                    description="No credentials. Test the surface the way an outsider would."
                                                    icon={ShieldAlert}
                                                    onClick={() => setBox(ScanBox.Black)}
                                                    selected={box === ScanBox.Black}
                                                    title="Black box"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : null}

                                {/* Step: templates */}
                                {currentKey === 'templates' ? (
                                    <div className="flex flex-col gap-5">
                                        <StepHead
                                            desc="Each selected template becomes its own isolated flow against the target. Tune the run mode per template."
                                            over={`Step ${currentNum} · Templates`}
                                            title="Choose templates"
                                        />
                                        <div className="flex max-h-[30rem] flex-col gap-3 overflow-y-auto">
                                            {availableTemplates.length === 0 ? (
                                                <p className="text-muted-foreground text-sm">
                                                    No templates tagged for this target type.
                                                </p>
                                            ) : (
                                                availableTemplates.map((template) => {
                                                    const isSel = !!selected[template.id];
                                                    const primaryType = template.targetTypes[0] ?? TargetType.General;
                                                    const GlyphIcon = TARGET_TYPE_ICON[primaryType] ?? Box;

                                                    return (
                                                        <div
                                                            className={cn('choice cursor-pointer', isSel && 'sel')}
                                                            key={template.id}
                                                            onClick={() => toggleTemplate(template.id)}
                                                        >
                                                            <span className="ci">
                                                                <GlyphIcon className="size-5" />
                                                            </span>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <span className="ct truncate">
                                                                        {template.title}
                                                                    </span>
                                                                    <span
                                                                        className={cn(
                                                                            'badge',
                                                                            template.systemOwned
                                                                                ? 'badge-sys'
                                                                                : 'badge-outline',
                                                                        )}
                                                                    >
                                                                        {template.systemOwned ? 'SYSTEM' : 'CUSTOM'}
                                                                    </span>
                                                                </div>
                                                                <div className="cd line-clamp-2">{template.text}</div>
                                                                <div
                                                                    className="mt-2.5 flex flex-wrap items-center gap-2.5"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <span className="chip">
                                                                        <GlyphIcon className="size-[13px]" />
                                                                        {getTargetTypeLabel(primaryType)}
                                                                    </span>
                                                                    {isSel ? (
                                                                        <>
                                                                            <span className="text-muted-foreground ml-auto font-mono text-[11px]">
                                                                                run as
                                                                            </span>
                                                                            <div className="seg">
                                                                                <button
                                                                                    className={cn(
                                                                                        selected[template.id] ===
                                                                                            ScanRunMode.Automatic &&
                                                                                            'active',
                                                                                    )}
                                                                                    onClick={() =>
                                                                                        setSelected((prev) => ({
                                                                                            ...prev,
                                                                                            [template.id]:
                                                                                                ScanRunMode.Automatic,
                                                                                        }))
                                                                                    }
                                                                                    type="button"
                                                                                >
                                                                                    Auto
                                                                                </button>
                                                                                <button
                                                                                    className={cn(
                                                                                        selected[template.id] ===
                                                                                            ScanRunMode.Assistant &&
                                                                                            'active',
                                                                                    )}
                                                                                    onClick={() =>
                                                                                        setSelected((prev) => ({
                                                                                            ...prev,
                                                                                            [template.id]:
                                                                                                ScanRunMode.Assistant,
                                                                                        }))
                                                                                    }
                                                                                    type="button"
                                                                                >
                                                                                    Assistant
                                                                                </button>
                                                                            </div>
                                                                        </>
                                                                    ) : null}
                                                                </div>
                                                            </div>
                                                            <Pip selected={isSel} />
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                        <p className="field-hint">
                                            Each template runs as its own flow. Default mode is Automatic; switch any to
                                            Assistant.
                                        </p>
                                    </div>
                                ) : null}

                                {/* Step: credentials */}
                                {currentKey === 'credentials' ? (
                                    <div className="flex flex-col gap-5">
                                        <StepHead
                                            desc={`These let the agents authenticate for ${
                                                targetClass === 'cloud' ? 'an internal cloud review' : 'a grey-box test'
                                            }.`}
                                            over={`Step ${currentNum} · Credentials`}
                                            title="Provide access"
                                        />
                                        {targetClass === 'cloud' && cloudProvider === TargetType.Aws ? (
                                            <>
                                                <Field
                                                    error={errFor('accessKeyId')}
                                                    label="Access key ID"
                                                >
                                                    <Input
                                                        aria-invalid={!!errFor('accessKeyId')}
                                                        onBlur={() => touch('accessKeyId')}
                                                        onChange={(e) => setCred('accessKeyId', e.target.value)}
                                                        placeholder="AKIA…"
                                                        value={creds.accessKeyId}
                                                    />
                                                </Field>
                                                <Field
                                                    error={errFor('secretAccessKey')}
                                                    label="Secret access key"
                                                >
                                                    <div className="relative">
                                                        <Input
                                                            aria-invalid={!!errFor('secretAccessKey')}
                                                            onBlur={() => touch('secretAccessKey')}
                                                            onChange={(e) => setCred('secretAccessKey', e.target.value)}
                                                            type={showSecret ? 'text' : 'password'}
                                                            value={creds.secretAccessKey}
                                                        />
                                                        <button
                                                            className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-2 flex items-center"
                                                            onClick={() => setShowSecret((s) => !s)}
                                                            type="button"
                                                        >
                                                            {showSecret ? (
                                                                <EyeOff className="size-4" />
                                                            ) : (
                                                                <Eye className="size-4" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </Field>
                                                <Field
                                                    error={errFor('region')}
                                                    hint="Optional — defaults to the credential's region."
                                                    label="Default region"
                                                >
                                                    <Input
                                                        aria-invalid={!!errFor('region')}
                                                        onBlur={() => touch('region')}
                                                        onChange={(e) => setCred('region', e.target.value)}
                                                        placeholder="us-east-1"
                                                        value={creds.region}
                                                    />
                                                </Field>
                                            </>
                                        ) : null}

                                        {targetClass === 'cloud' && cloudProvider === TargetType.Gcp ? (
                                            <Field
                                                error={errFor('serviceAccountJson')}
                                                hint="Paste the JSON key for the service account AI Pentest should act as."
                                                label="Service-account key (JSON)"
                                            >
                                                <Textarea
                                                    aria-invalid={!!errFor('serviceAccountJson')}
                                                    className="min-h-32 font-mono text-xs"
                                                    onBlur={() => touch('serviceAccountJson')}
                                                    onChange={(e) => setCred('serviceAccountJson', e.target.value)}
                                                    placeholder={
                                                        '{\n  "type": "service_account",\n  "project_id": "…"\n}'
                                                    }
                                                    value={creds.serviceAccountJson}
                                                />
                                            </Field>
                                        ) : null}

                                        {targetClass === 'cloud' && cloudProvider === TargetType.Azure ? (
                                            <>
                                                <Field
                                                    error={errFor('tenant')}
                                                    label="Tenant ID"
                                                >
                                                    <Input
                                                        aria-invalid={!!errFor('tenant')}
                                                        onBlur={() => touch('tenant')}
                                                        onChange={(e) => setCred('tenant', e.target.value)}
                                                        placeholder="00000000-0000-0000-0000-000000000000"
                                                        value={creds.tenant}
                                                    />
                                                </Field>
                                                <Field
                                                    error={errFor('appId')}
                                                    label="Application (client) ID"
                                                >
                                                    <Input
                                                        aria-invalid={!!errFor('appId')}
                                                        onBlur={() => touch('appId')}
                                                        onChange={(e) => setCred('appId', e.target.value)}
                                                        placeholder="00000000-0000-0000-0000-000000000000"
                                                        value={creds.appId}
                                                    />
                                                </Field>
                                                <Field
                                                    error={errFor('clientSecret')}
                                                    label="Client secret"
                                                >
                                                    <Input
                                                        aria-invalid={!!errFor('clientSecret')}
                                                        onBlur={() => touch('clientSecret')}
                                                        onChange={(e) => setCred('clientSecret', e.target.value)}
                                                        type="password"
                                                        value={creds.clientSecret}
                                                    />
                                                </Field>
                                            </>
                                        ) : null}

                                        {targetClass === 'web' ? (
                                            <div className="flex flex-col gap-2">
                                                <label className="field-label">Credential type</label>
                                                <div className="seg self-start">
                                                    <button
                                                        className={cn(webCredType === 'token' && 'active')}
                                                        onClick={() => setWebCredType('token')}
                                                        type="button"
                                                    >
                                                        Token
                                                    </button>
                                                    <button
                                                        className={cn(webCredType === 'form' && 'active')}
                                                        onClick={() => setWebCredType('form')}
                                                        type="button"
                                                    >
                                                        Email + password
                                                    </button>
                                                </div>
                                            </div>
                                        ) : null}

                                        {targetClass === 'web' && webCredType === 'token' ? (
                                            <>
                                                <Field
                                                    error={errFor('token')}
                                                    label="Token"
                                                >
                                                    <Input
                                                        aria-invalid={!!errFor('token')}
                                                        onBlur={() => touch('token')}
                                                        onChange={(e) => setCred('token', e.target.value)}
                                                        placeholder="Bearer token or API key"
                                                        type="password"
                                                        value={creds.token}
                                                    />
                                                </Field>
                                                <Field
                                                    error={errFor('protectedUrl')}
                                                    hint="A protected endpoint to test the token against (a public URL proves nothing)."
                                                    label="Protected URL"
                                                >
                                                    <Input
                                                        aria-invalid={!!errFor('protectedUrl')}
                                                        onBlur={() => touch('protectedUrl')}
                                                        onChange={(e) => setCred('protectedUrl', e.target.value)}
                                                        placeholder="https://app.acme.com/api/me"
                                                        value={creds.protectedUrl}
                                                    />
                                                </Field>
                                            </>
                                        ) : null}

                                        {targetClass === 'web' && webCredType === 'form' ? (
                                            <>
                                                <Field
                                                    error={errFor('loginUrl')}
                                                    hint="The form's POST endpoint — a bare target URL is not enough for form login."
                                                    label="Login URL"
                                                >
                                                    <Input
                                                        aria-invalid={!!errFor('loginUrl')}
                                                        onBlur={() => touch('loginUrl')}
                                                        onChange={(e) => setCred('loginUrl', e.target.value)}
                                                        placeholder="https://app.acme.com/login"
                                                        value={creds.loginUrl}
                                                    />
                                                </Field>
                                                <Field
                                                    error={errFor('email')}
                                                    label="Email / username"
                                                >
                                                    <Input
                                                        aria-invalid={!!errFor('email')}
                                                        onBlur={() => touch('email')}
                                                        onChange={(e) => setCred('email', e.target.value)}
                                                        placeholder="tester@acme.com"
                                                        value={creds.email}
                                                    />
                                                </Field>
                                                <Field
                                                    error={errFor('password')}
                                                    label="Password"
                                                >
                                                    <Input
                                                        aria-invalid={!!errFor('password')}
                                                        onBlur={() => touch('password')}
                                                        onChange={(e) => setCred('password', e.target.value)}
                                                        type="password"
                                                        value={creds.password}
                                                    />
                                                </Field>
                                            </>
                                        ) : null}

                                        <p className="field-hint flex items-center gap-1.5">
                                            <Lock className="size-[13px]" />
                                            Credentials are encrypted at rest and masked in logs. Login validation runs
                                            later, in the scan's terminal.
                                        </p>
                                    </div>
                                ) : null}

                                {/* Step: review */}
                                {currentKey === 'review' ? (
                                    <div className="flex flex-col gap-5">
                                        <StepHead
                                            desc="Confirm the engagement below. Each template starts as its own isolated flow."
                                            over={`Step ${currentNum} · Review`}
                                            title="Ready to launch"
                                        />
                                        <div className="overflow-hidden rounded-lg border">
                                            <div className="card-head">
                                                <span className="tgt-glyph">{summaryGlyph}</span>
                                                <h3 className="text-sm font-semibold">Scan summary</h3>
                                                <span className="badge badge-outline ml-auto">DRAFT</span>
                                            </div>
                                            <div className="border-border flex items-baseline justify-between gap-4 border-b px-4 py-3">
                                                <span className="text-[11px] overline">Target</span>
                                                <span className="text-right font-mono text-xs font-semibold">
                                                    {name.trim() || '—'}
                                                </span>
                                            </div>
                                            <div className="border-border flex items-baseline justify-between gap-4 border-b px-4 py-3">
                                                <span className="text-[11px] overline">Engagement</span>
                                                <span className="text-right font-mono text-xs font-semibold">
                                                    {targetClass === 'cloud'
                                                        ? `Cloud · ${cloudProvider?.toUpperCase()} · ${scope}`
                                                        : `Web · ${box === ScanBox.Grey ? 'Grey box' : 'Black box'}`}
                                                </span>
                                            </div>
                                            <div className="border-border flex items-baseline justify-between gap-4 border-b px-4 py-3">
                                                <span className="text-[11px] overline">Templates</span>
                                                <span className="text-right font-mono text-xs font-semibold">
                                                    {selectedIds.length} (
                                                    {
                                                        selectedIds.filter(
                                                            (id) => selected[id] === ScanRunMode.Assistant,
                                                        ).length
                                                    }{' '}
                                                    assistant)
                                                </span>
                                            </div>
                                            <div className="border-border flex items-baseline justify-between gap-4 border-b px-4 py-3">
                                                <span className="text-[11px] overline">Credentials</span>
                                                <span className="text-right font-mono text-xs font-semibold">
                                                    {needsCredentials ? 'Provided (encrypted)' : 'None'}
                                                </span>
                                            </div>
                                            <div className="border-border flex items-center gap-3 border-t px-4 py-3.5">
                                                <span className="text-muted-foreground font-mono text-xs">
                                                    About to start {selectedIds.length} flow
                                                    {selectedIds.length === 1 ? '' : 's'}.
                                                </span>
                                                <Button
                                                    className="ml-auto"
                                                    disabled={isLoading || !fullValid}
                                                    onClick={onSubmit}
                                                    type="button"
                                                >
                                                    {isLoading ? (
                                                        <Spinner variant="circle" />
                                                    ) : (
                                                        <Zap className="size-4" />
                                                    )}
                                                    Create scan
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}

                                {/* Footer nav */}
                                <div className="border-border mt-6 flex items-center justify-between gap-2 border-t pt-5">
                                    <Button
                                        onClick={() => (step === 0 ? navigate('/scans') : setStep((v) => v - 1))}
                                        type="button"
                                        variant="outline"
                                    >
                                        <ArrowLeft />
                                        {step === 0 ? 'Cancel' : 'Back'}
                                    </Button>
                                    {isLast ? null : (
                                        <Button
                                            disabled={!canAdvance}
                                            onClick={() => setStep((v) => v + 1)}
                                            type="button"
                                        >
                                            Next
                                            <ArrowRight />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Summary dossier — a live draft of the engagement shown while
                                building it. Hidden on the final review step, where the centred
                                review card is the single review + single call to action. */}
                            {!isLast && (
                                <aside className="summary-panel lg:sticky lg:top-[88px]">
                                    <div className="card-head">
                                        <span className="tgt-glyph">{summaryGlyph}</span>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-[13.5px] font-bold">Engagement</div>
                                            <div className="text-muted-foreground font-mono text-[10.5px]">
                                                Scan summary
                                            </div>
                                        </div>
                                        <span className="badge badge-outline">DRAFT</span>
                                    </div>
                                    <SpRow
                                        label="Target"
                                        value={name.trim() || '—'}
                                    />
                                    <SpRow
                                        label="Type"
                                        value={
                                            targetClass === 'cloud' ? 'Cloud' : targetClass === 'web' ? 'Web app' : '—'
                                        }
                                    />
                                    {targetClass === 'cloud' ? (
                                        <>
                                            <SpRow
                                                label="Provider"
                                                value={cloudProvider ? cloudProvider.toUpperCase() : '—'}
                                            />
                                            <SpRow
                                                label="Scope"
                                                value={scope ? cap(scope) : '—'}
                                            />
                                        </>
                                    ) : (
                                        <SpRow
                                            label="Box"
                                            value={
                                                box === ScanBox.Grey
                                                    ? 'Grey box'
                                                    : box === ScanBox.Black
                                                      ? 'Black box'
                                                      : '—'
                                            }
                                        />
                                    )}
                                    <SpRow
                                        label="Templates"
                                        value={selectedIds.length ? `${selectedIds.length} selected` : '—'}
                                    />
                                    <SpRow
                                        label="Run mode"
                                        value={runModeLabel}
                                    />
                                    <SpRow
                                        label="Credentials"
                                        value={needsCredentials ? (credComplete ? 'Provided' : 'Required') : 'None'}
                                    />
                                    <p className="field-hint p-[15px_15px_16px] leading-relaxed">
                                        {selectedIds.length > 0
                                            ? 'Each template runs as its own isolated flow · billed per agent token · stop any flow anytime. Use Next to review and launch.'
                                            : 'Select at least one template to launch.'}
                                    </p>
                                </aside>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default NewEngagement;
