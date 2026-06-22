// UI-only PREVIEW of the proposed Phase-3 "split terminals" execution view
// (see docs/requirements/new-engagement-flow-feasibility.md §12).
//
// The data below is REAL: it was pulled from the live PentAGI database
// (flow 1 "Security Assessment" on Oracle host 152.67.11.136) — the subtask titles, statuses, and
// terminal commands/output are verbatim (ANSI stripped, long output trimmed).
// This page only visualises how that already-tagged data would split into
// per-step terminal panes. There is no backend wiring.
import {
    CheckCircle2,
    CircleX,
    Layers,
    LayoutGrid,
    Loader2,
    PanelsTopLeft,
    Terminal as TerminalIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

interface CommandGroup {
    command: string;
    id: string;
    output: TermLine[];
    status: StepStatus;
    stepTitle: string;
}

type LineType = 'stderr' | 'stdin' | 'stdout';
interface Step {
    id: number;
    lines: TermLine[];
    status: StepStatus;
    title: string;
}

type StepStatus = 'failed' | 'finished' | 'running';

interface TermLine {
    text: string;
    type: LineType;
}

const ENGAGEMENT = {
    target: 'external hosts (192.168.1.100, 8.162.13.33, …)',
    task: 'Perform broad security assessment: reconnaissance, attack surface identification, high-impact vulnerability testing, remediation reporting',
    title: 'Security Assessment',
};

// Real subtasks (the panes) and their real terminal lines, pulled live from the
// Oracle-hosted instance (152.67.11.136 · flow 1 · container pentagi-terminal-1).
// Lines trimmed to ~16 per step for the preview; steps 31/32/41 ran no shell
// commands (LLM reporting/analysis), so they render as empty panes.
const STEPS: Step[] = [
    {
        id: 1,
        lines: [
            {
                text: '/work $ printenv | grep -E -i \'target|host|ip|domain|url|scope\' || echo "No matching environment variables found"',
                type: 'stdin',
            },
            { text: 'HOSTNAME=716237fc', type: 'stdout' },
            { text: '/work $ ls -la', type: 'stdin' },
            {
                text: 'total 8 drwxr-xr-x 2 root root 4096 Dec 31 01:34 . drwxr-xr-x 1 root root 4096 Jun 17 11:56 ..',
                type: 'stdout',
            },
            {
                text: '/work $ find /work -maxdepth 2 -type f \\( -name "*target*" -o -name "*scope*" -o -name "*host*" -o -name "*domain*" -o -nam',
                type: 'stdin',
            },
            { text: '', type: 'stdout' },
            { text: '/work $ printenv', type: 'stdin' },
            {
                text: 'CGO_ENABLED=1 HOSTNAME=716237fc HOME=/root TERM=xterm PATH=/root/go/bin:/usr/local/go/bin:/opt/venv/bin:/usr/local/',
                type: 'stdout',
            },
            {
                text: '/work $ find / -maxdepth 3 -type f \\( -name "*target*" -o -name "*scope*" -o -name "*assessment*" -o -name "*pentest*" \\) 2',
                type: 'stdin',
            },
            { text: '/usr/bin/make-first-existing-target', type: 'stdout' },
            { text: "/work $ cat /proc/1/environ 2>/dev/null | tr '\\0' '\\n' | head -30", type: 'stdin' },
            {
                text: 'PATH=/root/go/bin:/usr/local/go/bin:/opt/venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin HOST',
                type: 'stdout',
            },
        ],
        status: 'finished',
        title: 'Identify and confirm the target',
    },
    {
        id: 12,
        lines: [
            {
                text: '/work $ cd /work && find . -type f \\( -name "*.txt" -o -name "*.json" -o -name "*.xml" -o -name "*.md" \\) 2>/dev/null | hea',
                type: 'stdin',
            },
            { text: '', type: 'stdout' },
            { text: '/work $ cd /work && grep -r -l "192.168.1.100" . 2>/dev/null | head -20', type: 'stdin' },
            { text: '', type: 'stdout' },
            { text: '/work $ which theharvester curl nmap openssl 2>/dev/null', type: 'stdin' },
            { text: '/usr/bin/theharvester /usr/bin/curl /usr/bin/nmap /usr/bin/openssl', type: 'stdout' },
            { text: '/work $ ls -la /work/', type: 'stdin' },
            {
                text: 'total 8 drwxr-xr-x 2 root root 4096 Dec 31 01:34 . drwxr-xr-x 1 root root 4096 Jun 17 11:56 ..',
                type: 'stdout',
            },
            {
                text: '/work $ timeout 15 openssl s_client -connect 192.168.1.100:443 -servername 192.168.1.100 2>/dev/null | openssl x509 -noout',
                type: 'stdin',
            },
            { text: 'SSL certificate retrieval failed or timed out', type: 'stdout' },
            {
                text: '/work $ timeout 30 theharvester -d 192.168.1.100 -l 100 -b all 2>&1 || echo "theHarvester scan completed or timed out"',
                type: 'stdin',
            },
            {
                text: '\u250f\u2501(Message from Kali developers) \u2503 \u2503 The command theharvester is deprecated. Please use theHarvester instead. \u2503 \u2517\u2501',
                type: 'stdout',
            },
            { text: '/work $ timeout 30 theHarvester -d 192.168.1.100 -l 100 -b all 2>&1 | head -100', type: 'stdin' },
            { text: '', type: 'stdout' },
            {
                text: '/work $ timeout 15 curl -s "https://www.virustotal.com/vtapi/v2/ip-address/report?apikey=YOUR_API_KEY&ip=192.168.1.100" 2>&',
                type: 'stdin',
            },
            {
                text: '<!doctype html> <html lang=en> <title>403 Forbidden</title> <h1>Forbidden</h1> <p>You don&#39;t have the permission',
                type: 'stdout',
            },
        ],
        status: 'finished',
        title: 'Target-focused reconnaissance and intelligence gathering',
    },
    {
        id: 22,
        lines: [
            {
                text: '/work $ printenv | grep -iE \'PROXY|http|https\' || echo "No proxy environment variables found"',
                type: 'stdin',
            },
            { text: 'No proxy environment variables found', type: 'stdout' },
            { text: '/work $ ip route', type: 'stdin' },
            {
                text: 'default via 172.17.0.1 dev eth0  172.17.0.0/16 dev eth0 proto kernel scope link src 172.17.0.2',
                type: 'stdout',
            },
            { text: '/work $ ip addr', type: 'stdin' },
            {
                text: '1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000     link/loopback 00:00',
                type: 'stdout',
            },
            {
                text: '/work $ find /etc/openvpn /etc/wireguard /work /root /home -type f \\( -name "*.ovpn" -o -name "*.conf" -o -name "*.pem" -o',
                type: 'stdin',
            },
            { text: '/root/.config/pip/pip.conf', type: 'stdout' },
            {
                text: '/work $ ls -la /etc/openvpn/ 2>/dev/null || echo "OpenVPN directory not found or empty"',
                type: 'stdin',
            },
            { text: 'OpenVPN directory not found or empty', type: 'stdout' },
            {
                text: '/work $ ls -la /etc/wireguard/ 2>/dev/null || echo "WireGuard directory not found or empty"',
                type: 'stdin',
            },
            { text: 'WireGuard directory not found or empty', type: 'stdout' },
            {
                text: '/work $ ls -la /root/.ssh/ 2>/dev/null || echo "SSH directory not found or empty"',
                type: 'stdin',
            },
            {
                text: 'total 12 drwx------ 2 root root 4096 Dec 30 23:49 . drwx------ 1 root root 4096 Jun 17 12:04 ..',
                type: 'stdout',
            },
            { text: '/work $ cat /root/.ssh/config 2>/dev/null || echo "SSH config file not found"', type: 'stdin' },
            { text: 'SSH config file not found', type: 'stdout' },
        ],
        status: 'finished',
        title: 'Establish network connectivity and port scanning',
    },
    {
        id: 31,
        lines: [],
        status: 'finished',
        title: 'Generate comprehensive security assessment report',
    },
    {
        id: 32,
        lines: [],
        status: 'finished',
        title: 'Consolidate findings and risk assessment',
    },
    {
        id: 38,
        lines: [
            {
                text: '/work $ cd /work && psql -h 8.162.13.33 -p 5432 -U postgres -c "SELECT version();" 2>&1 <<EOF postgres EOF',
                type: 'stdin',
            },
            {
                text: 'psql: error: connection to server at "8.162.13.33", port 5432 failed: server closed the connection unexpectedly \tTh',
                type: 'stdout',
            },
            {
                text: '/work $ cd /work && psql -h 8.162.13.33 -p 5432 -U postgres -c "SELECT version();" 2>&1 <<EOF password EOF',
                type: 'stdin',
            },
            {
                text: 'psql: error: connection to server at "8.162.13.33", port 5432 failed: server closed the connection unexpectedly \tTh',
                type: 'stdout',
            },
            {
                text: '/work $ cd /work && psql -h 8.162.13.33 -p 5432 -U postgres -c "SELECT version();" 2>&1 <<EOF EOF',
                type: 'stdin',
            },
            {
                text: 'psql: error: connection to server at "8.162.13.33", port 5432 failed: server closed the connection unexpectedly \tTh',
                type: 'stdout',
            },
            {
                text: '/work $ cd /work && nmap -Pn -sV --script pgsql-brute,pgsql-empty-password -p 5432 8.162.13.33 -oN /work/postgresql_scan.tx',
                type: 'stdin',
            },
            {
                text: 'Starting Nmap 7.98 ( https://nmap.org ) at 2026-06-17 12:58 +0000 NSE: failed to initialize the script engine: /usr',
                type: 'stdout',
            },
            {
                text: '/work $ cd /work && timeout 10 ftp -n 185.144.224.40 2>&1 <<EOF user anonymous anonymous@example.com ls pwd ls .. ls / quit',
                type: 'stdin',
            },
            { text: 'timeout: failed to run command \u2018ftp\u2019: No such file or directory', type: 'stdout' },
            {
                text: '/work $ cd /work && nmap -Pn --script ftp-anon,ftp-vsftpd-backdoor,ftp-proftpd-backdoor -p 21 185.144.224.40 -oN /work/ftp_',
                type: 'stdin',
            },
            {
                text: 'Starting Nmap 7.98 ( https://nmap.org ) at 2026-06-17 12:58 +0000 Nmap scan report for server1.thysol.shockmedia.nl',
                type: 'stdout',
            },
            { text: '/work $ cd /work && nmap -Pn -sV --script pgsql-brute -p 5432 8.162.13.33 2>&1', type: 'stdin' },
            {
                text: 'Starting Nmap 7.98 ( https://nmap.org ) at 2026-06-17 12:58 +0000 Nmap scan report for 8.162.13.33 Host is up (0.27',
                type: 'stdout',
            },
            {
                text: '/work $ cd /work && lftp -u anonymous,anonymous@example.com 185.144.224.40 -e "ls; ls ..; ls /; quit" 2>&1 || echo "lftp te',
                type: 'stdin',
            },
            { text: 'sh: 1: lftp: not found lftp test completed', type: 'stdout' },
        ],
        status: 'finished',
        title: 'Active exploitation testing of critical external targets',
    },
    {
        id: 39,
        lines: [
            { text: '/work $ which ssh-audit || pip install ssh-audit 2>/dev/null', type: 'stdin' },
            {
                text: 'Collecting ssh-audit   Downloading ssh_audit-3.3.0-py3-none-any.whl.metadata (33 kB) Downloading ssh_audit-3.3.0-py',
                type: 'stdout',
            },
            {
                text: '/work $ cd /work && nmap -Pn -p22 --script ssh-audit,ssh-hostkey,sshv1 8.162.13.33 -oN ssh_nmap_8.162.13.33.txt 2>&1',
                type: 'stdin',
            },
            {
                text: 'Starting Nmap 7.98 ( https://nmap.org ) at 2026-06-17 13:33 +0000 NSE: failed to initialize the script engine: /usr',
                type: 'stdout',
            },
            {
                text: '/work $ cd /work && nmap -Pn -p22 --script ssh-audit,ssh-hostkey,sshv1 185.144.224.40 -oN ssh_nmap_185.144.224.40.txt 2>&1',
                type: 'stdin',
            },
            {
                text: 'Starting Nmap 7.98 ( https://nmap.org ) at 2026-06-17 13:33 +0000 NSE: failed to initialize the script engine: /usr',
                type: 'stdout',
            },
            {
                text: '/work $ cd /work && nmap -Pn -p22 --script ssh-audit,ssh-hostkey,sshv1 72.60.249.156 -oN ssh_nmap_72.60.249.156.txt 2>&1',
                type: 'stdin',
            },
            {
                text: 'Starting Nmap 7.98 ( https://nmap.org ) at 2026-06-17 13:33 +0000 NSE: failed to initialize the script engine: /usr',
                type: 'stdout',
            },
            {
                text: '/work $ cd /work && nmap -Pn -p22 --script ssh-hostkey,sshv1,ssh-enum-users 8.162.13.33 -oN ssh_nmap_8.162.13.33.txt 2>&1',
                type: 'stdin',
            },
            {
                text: 'Starting Nmap 7.98 ( https://nmap.org ) at 2026-06-17 13:33 +0000 NSE: failed to initialize the script engine: /usr',
                type: 'stdout',
            },
            {
                text: '/work $ cd /work && nmap -Pn -p22 --script ssh-hostkey,sshv1 185.144.224.40 -oN ssh_nmap_185.144.224.40.txt 2>&1',
                type: 'stdin',
            },
            {
                text: 'Starting Nmap 7.98 ( https://nmap.org ) at 2026-06-17 13:33 +0000 Nmap scan report for server1.thysol.shockmedia.nl',
                type: 'stdout',
            },
            {
                text: '/work $ cd /work && nmap -Pn -p22 --script ssh-hostkey,sshv1 72.60.249.156 -oN ssh_nmap_72.60.249.156.txt 2>&1',
                type: 'stdin',
            },
            {
                text: 'Starting Nmap 7.98 ( https://nmap.org ) at 2026-06-17 13:33 +0000 Nmap scan report for srv1052971.hstgr.cloud (72.6',
                type: 'stdout',
            },
            {
                text: '/work $ cd /work && nmap -Pn -p22 --script ssh-hostkey,sshv1 8.162.13.33 -oN ssh_nmap_8.162.13.33.txt 2>&1',
                type: 'stdin',
            },
            {
                text: 'Starting Nmap 7.98 ( https://nmap.org ) at 2026-06-17 13:34 +0000 Nmap scan report for 8.162.13.33 Host is up (0.40',
                type: 'stdout',
            },
        ],
        status: 'finished',
        title: 'SSH service security validation',
    },
    {
        id: 40,
        lines: [
            {
                text: '/work $ cd /work && echo "=== PostgreSQL Security Testing on 8.162.13.33:5432 ===" > postgresql_test_results.txt && date >>',
                type: 'stdin',
            },
            { text: '', type: 'stdout' },
            {
                text: '/work $ cd /work && echo -e "\\n=== STEP 1: Banner Grabbing with nc ===" >> postgresql_test_results.txt && timeout 10 nc -v',
                type: 'stdin',
            },
            { text: '', type: 'stdout' },
            {
                text: '/work $ cd /work && echo -e "\\n=== STEP 2: Nmap PostgreSQL NSE Scripts ===" >> postgresql_test_results.txt && nmap -Pn -sV',
                type: 'stdin',
            },
            {
                text: "NSE: failed to initialize the script engine: /usr/share/nmap/nse_main.lua:829: 'postgres-info' did not match a cate",
                type: 'stdout',
            },
            {
                text: '/work $ cd /work && echo -e "\\n=== Available PostgreSQL NSE Scripts ===" >> postgresql_test_results.txt && ls /usr/share/nm',
                type: 'stdin',
            },
            { text: '', type: 'stdout' },
            {
                text: '/work $ cd /work && nmap -Pn -sV -p 5432 --script pgsql-brute 8.162.13.33 2>&1 >> postgresql_test_results.txt',
                type: 'stdin',
            },
            { text: '', type: 'stdout' },
            { text: '/work $ cd /work && cat postgresql_test_results.txt', type: 'stdin' },
            {
                text: '=== PostgreSQL Security Testing on 8.162.13.33:5432 === Wed Jun 17 13:59:16 UTC 2026 -e  === STEP 1: Banner Grabbin',
                type: 'stdout',
            },
            {
                text: '/work $ cd /work && echo -e "\\n=== STEP 3: PSQL Credential Testing ===" >> postgresql_test_results.txt && echo "Attempt 1:',
                type: 'stdin',
            },
            { text: 'sh: 1: Syntax error: redirection unexpected', type: 'stdout' },
            {
                text: '/work $ cd /work && echo -e "\\n=== STEP 3: PSQL Credential Testing ===" >> postgresql_test_results.txt && echo "Attempt 1:',
                type: 'stdin',
            },
            {
                text: 'psql: error: connection to server at "8.162.13.33", port 5432 failed: server closed the connection unexpectedly \tTh',
                type: 'stdout',
            },
        ],
        status: 'finished',
        title: 'Test exposed PostgreSQL database on 8.162.13.33',
    },
    {
        id: 41,
        lines: [],
        status: 'finished',
        title: 'Final vulnerability validation and report enhancement',
    },
];

const statusMeta: Record<StepStatus, { className: string; icon: typeof CheckCircle2; label: string }> = {
    failed: { className: 'text-destructive', icon: CircleX, label: 'failed' },
    finished: { className: 'text-emerald-500', icon: CheckCircle2, label: 'done' },
    running: { className: 'text-yellow-500', icon: Loader2, label: 'running' },
};

const StatusIcon = ({ status }: { status: StepStatus }) => {
    const { className, icon: Icon } = statusMeta[status];

    return <Icon className={cn('size-4 shrink-0', className, status === 'running' && 'animate-spin')} />;
};

// A single terminal pane styled like a dark console window (matches the PDF panes).
// In production this is the existing xterm <Terminal> component, one instance per
// group. The same pane renders either a whole step or a single command.
const TerminalWindow = ({
    className,
    emptyNote,
    lines,
    meta,
    status,
    title,
}: {
    className?: string;
    emptyNote?: string;
    lines: TermLine[];
    meta?: string;
    status?: StepStatus;
    title: string;
}) => (
    <div className={cn('flex flex-col overflow-hidden rounded-md border bg-zinc-950', className)}>
        <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-3 py-1.5">
            <span className="flex gap-1.5">
                <span className="size-2.5 rounded-full bg-red-500/80" />
                <span className="size-2.5 rounded-full bg-yellow-500/80" />
                <span className="size-2.5 rounded-full bg-emerald-500/80" />
            </span>
            <span className="ml-1 truncate font-mono text-xs font-medium text-zinc-300">{title}</span>
            <span className="ml-auto flex shrink-0 items-center gap-2">
                {meta ? <span className="text-[10px] whitespace-nowrap text-zinc-500">{meta}</span> : null}
                {status ? <StatusIcon status={status} /> : null}
            </span>
        </div>
        <div className="grow space-y-0.5 overflow-y-auto p-3 font-mono text-xs leading-relaxed">
            {lines.length === 0 && emptyNote ? (
                <div className="text-zinc-600 italic">{emptyNote}</div>
            ) : (
                lines.map((line, index) => (
                    <div
                        className={cn(
                            'break-all whitespace-pre-wrap',
                            line.type === 'stdin'
                                ? 'text-emerald-300'
                                : line.type === 'stderr'
                                  ? 'text-red-300'
                                  : 'text-zinc-400',
                        )}
                        key={index}
                    >
                        {line.text}
                    </div>
                ))
            )}
        </div>
    </div>
);

const ExecutionPreview = () => {
    const [granularity, setGranularity] = useState<'command' | 'step'>('step');
    const [layout, setLayout] = useState<'grid' | 'tabs'>('grid');

    // Per-command split: each stdin line starts a new pane; the stdout/stderr lines
    // that follow (until the next command) are its output. This mirrors how a real
    // per-command view pairs output to its command by order — note some commands
    // produce no output (the empty panes), exactly why robust per-command panes
    // want an explicit exec id (see feasibility doc §12).
    const commandGroups = useMemo<CommandGroup[]>(() => {
        const groups: CommandGroup[] = [];

        for (const step of STEPS) {
            let current: CommandGroup | null = null;

            step.lines.forEach((line, index) => {
                if (line.type === 'stdin') {
                    current = {
                        command: line.text.replace(/^\/work \$ /, ''),
                        id: `${step.id}-${index}`,
                        output: [],
                        status: step.status,
                        stepTitle: step.title,
                    };
                    groups.push(current);
                } else if (current) {
                    current.output.push(line);
                }
            });
        }

        return groups;
    }, []);

    const completed = STEPS.filter((step) => step.status === 'finished').length;
    const total = STEPS.length;
    const percent = Math.round((completed / total) * 100);

    return (
        <>
            <header className="bg-background sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator
                    className="mr-2 h-4"
                    orientation="vertical"
                />
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbPage>Execution view</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <Badge
                    className="ml-2"
                    variant="outline"
                >
                    UI preview · real data
                </Badge>
            </header>

            <div className="flex min-h-[calc(100dvh-3rem)] justify-center p-4">
                <Card className="w-full max-w-5xl">
                    <CardContent className="flex flex-col gap-5 pt-6">
                        {/* Engagement header + progress rail */}
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <h1 className="text-xl font-semibold">{ENGAGEMENT.title}</h1>
                                    <p className="text-muted-foreground mt-1 text-sm">{ENGAGEMENT.task}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <ToggleGroup
                                        onValueChange={(value) => value && setGranularity(value as 'command' | 'step')}
                                        type="single"
                                        value={granularity}
                                    >
                                        <ToggleGroupItem value="step">
                                            <Layers className="size-4" />
                                            Per step
                                        </ToggleGroupItem>
                                        <ToggleGroupItem value="command">
                                            <TerminalIcon className="size-4" />
                                            Per command
                                        </ToggleGroupItem>
                                    </ToggleGroup>
                                    {granularity === 'step' ? (
                                        <ToggleGroup
                                            onValueChange={(value) => value && setLayout(value as 'grid' | 'tabs')}
                                            type="single"
                                            value={layout}
                                        >
                                            <ToggleGroupItem value="tabs">
                                                <PanelsTopLeft className="size-4" />
                                                Tabs
                                            </ToggleGroupItem>
                                            <ToggleGroupItem value="grid">
                                                <LayoutGrid className="size-4" />
                                                Grid
                                            </ToggleGroupItem>
                                        </ToggleGroup>
                                    ) : null}
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        {completed} of {total} steps complete
                                    </span>
                                    <span className="font-medium">{percent}%</span>
                                </div>
                                <Progress value={percent} />
                                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                    {STEPS.map((step) => (
                                        <span
                                            className="text-muted-foreground flex items-center gap-1.5 text-xs"
                                            key={step.id}
                                        >
                                            <StatusIcon status={step.status} />
                                            {step.title}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Split terminals */}
                        {granularity === 'command' ? (
                            // Finest granularity: one pane per individual command.
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {commandGroups.map((group) => (
                                    <TerminalWindow
                                        className="h-44"
                                        emptyNote="(no output captured)"
                                        key={group.id}
                                        lines={group.output}
                                        meta={group.status === 'failed' ? 'failed step' : undefined}
                                        status={group.status}
                                        title={`$ ${group.command}`}
                                    />
                                ))}
                            </div>
                        ) : layout === 'tabs' ? (
                            <Tabs
                                className="w-full"
                                defaultValue={String(STEPS[1]?.id ?? STEPS[0]?.id)}
                            >
                                <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
                                    {STEPS.map((step) => (
                                        <TabsTrigger
                                            className="gap-1.5"
                                            key={step.id}
                                            value={String(step.id)}
                                        >
                                            <StatusIcon status={step.status} />
                                            <span className="max-w-40 truncate">{step.title}</span>
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                                {STEPS.map((step) => (
                                    <TabsContent
                                        key={step.id}
                                        value={String(step.id)}
                                    >
                                        <TerminalWindow
                                            className="h-[26rem]"
                                            emptyNote="(no terminal output — reporting / analysis step)"
                                            lines={step.lines}
                                            meta={`${step.lines.filter((line) => line.type === 'stdin').length} cmds`}
                                            status={step.status}
                                            title={step.title}
                                        />
                                    </TabsContent>
                                ))}
                            </Tabs>
                        ) : (
                            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                {STEPS.map((step) => (
                                    <TerminalWindow
                                        className="h-64"
                                        emptyNote="(no terminal output — reporting / analysis step)"
                                        key={step.id}
                                        lines={step.lines}
                                        meta={`${step.lines.filter((line) => line.type === 'stdin').length} cmds`}
                                        status={step.status}
                                        title={step.title}
                                    />
                                ))}
                            </div>
                        )}

                        <p className="text-muted-foreground flex items-center gap-2 text-xs">
                            <TerminalIcon className="size-3.5 shrink-0" />
                            {granularity === 'command'
                                ? `Per-command split: ${commandGroups.length} panes, one per command, paired to its output by order. Per-command status isn't tracked today (panes inherit the step's status) — a small backend exec-id addition would fix that.`
                                : 'Per-step split: each pane is one subtask. Grouped by the subtask_id already present on every terminal log — no backend change needed.'}
                        </p>
                    </CardContent>
                </Card>
            </div>
        </>
    );
};

export default ExecutionPreview;
