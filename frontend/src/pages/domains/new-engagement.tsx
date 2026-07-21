// New "Scan" engagement wizard, wired to the createScan mutation. It is a
// separate sidebar entry from the classic Scans (domains) form and does not
// change it. Flow: target + kind -> scope/box (+cloud provider) -> templates by
// type with per-template Automatic/Assistant -> credentials (internal/grey only)
// -> review -> create. The login/access validation is intentionally NOT here; it
// runs later in the flow/terminal (see the feasibility doc).
import {
    ArrowLeft,
    ArrowRight,
    Check,
    Cloud,
    Eye,
    EyeOff,
    Globe,
    KeyRound,
    Lock,
    Server,
    ShieldAlert,
    ShieldCheck,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import CommandBar from '@/components/layouts/command-bar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import ScanInitializing from '@/features/flows/scan-initializing';
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
import { getTargetTypeLabel } from '@/lib/target-type-colors';
import { cn } from '@/lib/utils';
import { useTemplates } from '@/providers/templates-provider';

type CloudProvider = TargetType.Aws | TargetType.Azure | TargetType.Gcp;
type StepKey = 'credentials' | 'review' | 'scope' | 'target' | 'templates';
type TargetClass = 'cloud' | 'web';
type WebCredType = 'form' | 'token';

const ChoiceCard = ({
    description,
    icon: Icon,
    onClick,
    selected,
    tag,
    title,
}: {
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
    selected: boolean;
    tag?: string;
    title: string;
}) => (
    <button
        className={cn(
            'flex w-full flex-1 items-center gap-3 rounded-lg border p-4 text-left transition-colors',
            selected
                ? 'border-primary bg-brand-tint-2 shadow-[0_0_0_3px_var(--brand-tint-2)]'
                : 'border-border-strong hover:border-muted-foreground/40',
        )}
        onClick={onClick}
        type="button"
    >
        <span
            className={cn(
                'text-primary flex size-10 shrink-0 items-center justify-center rounded-[10px] border',
                selected ? 'border-primary bg-primary/10' : 'bg-muted',
            )}
        >
            <Icon className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold">{title}</span>
                {tag ? <Badge variant="secondary">{tag}</Badge> : null}
            </span>
            <span className="text-muted-foreground mt-0.5 block text-xs leading-relaxed">{description}</span>
        </span>
        {selected ? (
            <span className="bg-primary text-primary-foreground flex size-[22px] shrink-0 items-center justify-center rounded-full">
                <Check className="size-3.5" />
            </span>
        ) : (
            <span className="border-border-strong size-[22px] shrink-0 rounded-full border" />
        )}
    </button>
);

const Field = ({ children, hint, label }: { children: React.ReactNode; hint?: string; label: string }) => (
    <div className="flex flex-col gap-2">
        <Label>{label}</Label>
        {children}
        {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
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

    // The concrete target type that drives template filtering + the scan record.
    // Cloud maps to the single TargetType.Cloud regardless of which provider
    // (AWS/Azure/GCP) the user picked; the provider only selects the credential kind.
    const targetType: null | TargetType =
        targetClass === 'cloud' ? TargetType.Cloud : targetClass === 'web' ? TargetType.WebApp : null;

    // Credentials only for internal (cloud) / grey box (web).
    const needsCredentials =
        (targetClass === 'cloud' && scope === ScanScope.Internal) || (targetClass === 'web' && box === ScanBox.Grey);

    const availableTemplates = useMemo(() => {
        if (targetClass === 'cloud' && cloudProvider) {
            return templates.filter((t) => t.targetTypes.includes(TargetType.Cloud));
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
                // Require the active branch's credential fields to be filled so we
                // never store/deliver an all-empty credential.
                if (targetClass === 'cloud' && cloudProvider === TargetType.Aws) {
                    return !!creds.accessKeyId.trim() && !!creds.secretAccessKey.trim();
                }

                if (targetClass === 'cloud' && cloudProvider === TargetType.Gcp) {
                    return !!creds.serviceAccountJson.trim();
                }

                if (targetClass === 'cloud' && cloudProvider === TargetType.Azure) {
                    return !!creds.tenant.trim() && !!creds.appId.trim() && !!creds.clientSecret.trim();
                }

                if (targetClass === 'web' && webCredType === 'token') {
                    return !!creds.token.trim() && !!creds.protectedUrl.trim();
                }

                if (targetClass === 'web' && webCredType === 'form') {
                    return !!creds.loginUrl.trim() && !!creds.email.trim() && !!creds.password.trim();
                }

                return false;
            case 'scope':
                if (targetClass === 'cloud') {
                    return !!cloudProvider && !!scope;
                }

                return !!box;
            case 'target':
                return !!name.trim() && !!targetClass;
            case 'templates':
                return selectedIds.length > 0;
            default:
                return true;
        }
    }, [currentKey, name, targetClass, cloudProvider, scope, box, selectedIds.length, webCredType, creds]);

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
                value: JSON.stringify({ protected_url: creds.protectedUrl, token: creds.token }),
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
                title="New engagement"
            />

            <div className="flex min-h-[calc(100dvh-3rem)] items-start justify-center p-6">
                {isLoading ? (
                    <Card className="w-full max-w-3xl">
                        <CardContent className="pt-6">
                            <ScanInitializing
                                className="py-10"
                                stageIndex={createStage}
                            />
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="w-full max-w-3xl">
                        <CardContent className="flex flex-col gap-6 pt-6">
                            <div className="text-center">
                                <h1 className="text-2xl font-semibold">Configure a scan</h1>
                                <p className="text-muted-foreground mt-2">
                                    Pick a target, set the scope, choose templates, and provide access where needed.
                                </p>
                            </div>

                            {/* Stepper */}
                            <div className="flex items-center">
                                {stepKeys.map((key, index) => {
                                    const completed = index < step;
                                    const active = index === step;

                                    return (
                                        <div
                                            className="flex flex-1 items-center last:flex-none"
                                            key={key}
                                        >
                                            <span
                                                className={cn(
                                                    'flex size-7 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-semibold',
                                                    completed
                                                        ? 'border-[var(--st-finished)] bg-[var(--st-finished)] text-[#04150C]'
                                                        : active
                                                          ? 'border-primary bg-brand-tint text-primary shadow-[0_0_0_4px_var(--brand-tint-2)]'
                                                          : 'border-border-strong text-muted-foreground bg-card',
                                                )}
                                            >
                                                {completed ? <Check className="size-3.5" /> : index + 1}
                                            </span>
                                            {index < stepKeys.length - 1 ? (
                                                <Separator className={cn('mx-3 flex-1', completed && 'bg-primary')} />
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>

                            <Separator />

                            {/* Step: target + kind */}
                            {currentKey === 'target' ? (
                                <div className="flex flex-col gap-5">
                                    <Field
                                        hint="A domain, host, URL, or cloud account/asset identifier."
                                        label="Target"
                                    >
                                        <Input
                                            autoFocus
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="acme.com"
                                            value={name}
                                        />
                                    </Field>
                                    <div className="flex flex-col gap-2">
                                        <Label>Select pentest target</Label>
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
                                    <div className="flex flex-col gap-2">
                                        <Label>Cloud provider</Label>
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
                                                    title={p.toUpperCase()}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Label>Internal or external scope?</Label>
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
                                <div className="flex flex-col gap-2">
                                    <Label>Grey box or black box?</Label>
                                    <div className="flex flex-col gap-3 sm:flex-row">
                                        <ChoiceCard
                                            description="Partial access is given. PentAGI logs in with supplied credentials."
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
                            ) : null}

                            {/* Step: templates */}
                            {currentKey === 'templates' ? (
                                <div className="flex flex-col gap-2">
                                    <Label>
                                        Templates to run{targetType ? ` for ${getTargetTypeLabel(targetType)}` : ''}
                                    </Label>
                                    <div className="bg-well/40 flex max-h-[28rem] flex-col gap-2 overflow-y-auto rounded-lg border p-2">
                                        {availableTemplates.length === 0 ? (
                                            <p className="text-muted-foreground p-3 text-center text-sm">
                                                No templates tagged for this target type.
                                            </p>
                                        ) : (
                                            availableTemplates.map((template) => {
                                                const isSel = !!selected[template.id];

                                                return (
                                                    <div
                                                        className={cn(
                                                            'bg-card flex items-start gap-2 rounded-md border p-2.5 transition-colors',
                                                            isSel ? 'border-primary bg-primary/5' : 'border-border',
                                                        )}
                                                        key={template.id}
                                                    >
                                                        <button
                                                            className="flex min-w-0 flex-1 items-start gap-2 text-left"
                                                            onClick={() => toggleTemplate(template.id)}
                                                            type="button"
                                                        >
                                                            <span
                                                                className={cn(
                                                                    'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border',
                                                                    isSel
                                                                        ? 'border-primary bg-primary text-primary-foreground'
                                                                        : 'border-input',
                                                                )}
                                                            >
                                                                {isSel ? <Check className="size-3" /> : null}
                                                            </span>
                                                            <span className="flex min-w-0 flex-1 flex-col">
                                                                <span className="truncate text-sm font-medium">
                                                                    {template.title}
                                                                </span>
                                                                <span className="text-muted-foreground line-clamp-1 text-xs">
                                                                    {template.text}
                                                                </span>
                                                            </span>
                                                        </button>
                                                        {isSel ? (
                                                            <ToggleGroup
                                                                onValueChange={(v) =>
                                                                    v &&
                                                                    setSelected((prev) => ({
                                                                        ...prev,
                                                                        [template.id]: v as ScanRunMode,
                                                                    }))
                                                                }
                                                                size="sm"
                                                                type="single"
                                                                value={selected[template.id]}
                                                            >
                                                                <ToggleGroupItem value={ScanRunMode.Automatic}>
                                                                    Auto
                                                                </ToggleGroupItem>
                                                                <ToggleGroupItem value={ScanRunMode.Assistant}>
                                                                    Assistant
                                                                </ToggleGroupItem>
                                                            </ToggleGroup>
                                                        ) : null}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                    <p className="text-muted-foreground text-xs">
                                        Each template runs as its own flow. Default mode is Automatic; switch any to
                                        Assistant.
                                    </p>
                                </div>
                            ) : null}

                            {/* Step: credentials */}
                            {currentKey === 'credentials' ? (
                                <div className="flex flex-col gap-5">
                                    {targetClass === 'cloud' && cloudProvider === TargetType.Aws ? (
                                        <>
                                            <Field label="Access key ID">
                                                <Input
                                                    onChange={(e) => setCred('accessKeyId', e.target.value)}
                                                    placeholder="AKIA…"
                                                    value={creds.accessKeyId}
                                                />
                                            </Field>
                                            <Field label="Secret access key">
                                                <div className="relative">
                                                    <Input
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
                                            <Field label="Default region">
                                                <Input
                                                    onChange={(e) => setCred('region', e.target.value)}
                                                    placeholder="us-east-1"
                                                    value={creds.region}
                                                />
                                            </Field>
                                        </>
                                    ) : null}

                                    {targetClass === 'cloud' && cloudProvider === TargetType.Gcp ? (
                                        <Field
                                            hint="Paste the JSON key for the service account PentAGI should act as."
                                            label="Service-account key (JSON)"
                                        >
                                            <Textarea
                                                className="min-h-32 font-mono text-xs"
                                                onChange={(e) => setCred('serviceAccountJson', e.target.value)}
                                                placeholder={'{\n  "type": "service_account",\n  "project_id": "…"\n}'}
                                                value={creds.serviceAccountJson}
                                            />
                                        </Field>
                                    ) : null}

                                    {targetClass === 'cloud' && cloudProvider === TargetType.Azure ? (
                                        <>
                                            <Field label="Tenant ID">
                                                <Input
                                                    onChange={(e) => setCred('tenant', e.target.value)}
                                                    value={creds.tenant}
                                                />
                                            </Field>
                                            <Field label="Application (client) ID">
                                                <Input
                                                    onChange={(e) => setCred('appId', e.target.value)}
                                                    value={creds.appId}
                                                />
                                            </Field>
                                            <Field label="Client secret">
                                                <Input
                                                    onChange={(e) => setCred('clientSecret', e.target.value)}
                                                    type="password"
                                                    value={creds.clientSecret}
                                                />
                                            </Field>
                                        </>
                                    ) : null}

                                    {targetClass === 'web' ? (
                                        <div className="flex flex-col gap-2">
                                            <Label>Credential type</Label>
                                            <div className="flex flex-col gap-3 sm:flex-row">
                                                <ChoiceCard
                                                    description="An auth/bearer token or API key."
                                                    icon={KeyRound}
                                                    onClick={() => setWebCredType('token')}
                                                    selected={webCredType === 'token'}
                                                    title="Token"
                                                />
                                                <ChoiceCard
                                                    description="Email + password against a login form."
                                                    icon={Lock}
                                                    onClick={() => setWebCredType('form')}
                                                    selected={webCredType === 'form'}
                                                    title="Email + password"
                                                />
                                            </div>
                                        </div>
                                    ) : null}

                                    {targetClass === 'web' && webCredType === 'token' ? (
                                        <>
                                            <Field label="Token">
                                                <Input
                                                    onChange={(e) => setCred('token', e.target.value)}
                                                    placeholder="Bearer token or API key"
                                                    type="password"
                                                    value={creds.token}
                                                />
                                            </Field>
                                            <Field
                                                hint="A protected endpoint to test the token against (a public URL proves nothing)."
                                                label="Protected URL"
                                            >
                                                <Input
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
                                                hint="The form's POST endpoint — a bare target URL is not enough for form login."
                                                label="Login URL"
                                            >
                                                <Input
                                                    onChange={(e) => setCred('loginUrl', e.target.value)}
                                                    placeholder="https://app.acme.com/login"
                                                    value={creds.loginUrl}
                                                />
                                            </Field>
                                            <Field label="Email / username">
                                                <Input
                                                    onChange={(e) => setCred('email', e.target.value)}
                                                    placeholder="tester@acme.com"
                                                    value={creds.email}
                                                />
                                            </Field>
                                            <Field label="Password">
                                                <Input
                                                    onChange={(e) => setCred('password', e.target.value)}
                                                    type="password"
                                                    value={creds.password}
                                                />
                                            </Field>
                                        </>
                                    ) : null}

                                    <p className="text-muted-foreground text-xs">
                                        Credentials are encrypted at rest and masked in logs. Login validation runs
                                        later, in the scan's terminal.
                                    </p>
                                </div>
                            ) : null}

                            {/* Step: review */}
                            {currentKey === 'review' ? (
                                <div className="overflow-hidden rounded-lg border">
                                    <div className="border-border flex items-center gap-2.5 border-b px-4 py-3.5">
                                        <span className="bg-muted text-primary flex size-8 shrink-0 items-center justify-center rounded-lg border">
                                            {targetClass === 'cloud' ? (
                                                <Cloud className="size-4" />
                                            ) : (
                                                <Globe className="size-4" />
                                            )}
                                        </span>
                                        <h3 className="text-sm font-semibold">Scan summary</h3>
                                        <Badge
                                            className="ml-auto"
                                            variant="outline"
                                        >
                                            CreateScanInput
                                        </Badge>
                                    </div>
                                    <div className="border-border flex items-baseline justify-between gap-4 border-b px-4 py-3">
                                        <span className="text-muted-foreground font-mono text-[11px] tracking-[0.06em] uppercase">
                                            Target
                                        </span>
                                        <span className="text-right font-mono text-xs font-semibold">
                                            {name.trim() || '—'}
                                        </span>
                                    </div>
                                    <div className="border-border flex items-baseline justify-between gap-4 border-b px-4 py-3">
                                        <span className="text-muted-foreground font-mono text-[11px] tracking-[0.06em] uppercase">
                                            Engagement
                                        </span>
                                        <span className="text-right font-mono text-xs font-semibold">
                                            {targetClass === 'cloud'
                                                ? `Cloud · ${cloudProvider?.toUpperCase()} · ${scope}`
                                                : `Web · ${box === ScanBox.Grey ? 'Grey box' : 'Black box'}`}
                                        </span>
                                    </div>
                                    <div className="border-border flex items-baseline justify-between gap-4 border-b px-4 py-3">
                                        <span className="text-muted-foreground font-mono text-[11px] tracking-[0.06em] uppercase">
                                            Templates
                                        </span>
                                        <span className="text-right font-mono text-xs font-semibold">
                                            {selectedIds.length} (
                                            {selectedIds.filter((id) => selected[id] === ScanRunMode.Assistant).length}{' '}
                                            assistant)
                                        </span>
                                    </div>
                                    <div className="border-border flex items-baseline justify-between gap-4 border-b px-4 py-3">
                                        <span className="text-muted-foreground font-mono text-[11px] tracking-[0.06em] uppercase">
                                            Credentials
                                        </span>
                                        <span className="text-right font-mono text-xs font-semibold">
                                            {needsCredentials ? 'Provided (encrypted)' : 'None'}
                                        </span>
                                    </div>
                                    <p className="text-muted-foreground px-4 py-3 font-mono text-xs">
                                        About to start {selectedIds.length} flow{selectedIds.length === 1 ? '' : 's'}.
                                    </p>
                                </div>
                            ) : null}

                            {/* Footer nav */}
                            <div className="flex items-center justify-between gap-2">
                                <Button
                                    onClick={() => (step === 0 ? navigate('/scans') : setStep((v) => v - 1))}
                                    type="button"
                                    variant="outline"
                                >
                                    <ArrowLeft />
                                    {step === 0 ? 'Cancel' : 'Back'}
                                </Button>
                                {isLast ? (
                                    <Button
                                        disabled={isLoading || selectedIds.length === 0}
                                        onClick={onSubmit}
                                        type="button"
                                    >
                                        {isLoading ? <Spinner variant="circle" /> : null}
                                        Create scan
                                    </Button>
                                ) : (
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
                        </CardContent>
                    </Card>
                )}
            </div>
        </>
    );
};

export default NewEngagement;
