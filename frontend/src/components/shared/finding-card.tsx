import { Check, Copy, ExternalLink, ImageOff, ShieldCheck } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import type { Finding, ReportScreenshot } from '@/lib/report-model';

import Markdown from '@/components/shared/markdown';
import { SeverityBadge } from '@/components/shared/severity-badge';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { copyToClipboard } from '@/lib/report';
import { getSeverityStyle } from '@/lib/severity-palette';
import { cn } from '@/lib/utils';

const CopyButton = ({ value }: { value: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        const ok = await copyToClipboard(value);

        if (ok) {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }
    };

    return (
        <button
            aria-label="Copy URL"
            className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
            onClick={handleCopy}
            type="button"
        >
            {copied ? <Check className="size-3.5 text-teal-600" /> : <Copy className="size-3.5" />}
        </button>
    );
};

const ScreenshotView = ({ shot }: { shot: ReportScreenshot }) => (
    <figure className="border-border overflow-hidden rounded-md border">
        {shot.dataUrl ? (
            <img
                alt={shot.alt ?? shot.name}
                className="block w-full"
                src={shot.dataUrl}
            />
        ) : (
            <div
                aria-label={`Screenshot unavailable: ${shot.name}`}
                className="bg-muted text-muted-foreground flex aspect-video items-center justify-center"
                role="img"
            >
                <ImageOff
                    aria-hidden
                    className="size-6 opacity-50"
                />
            </div>
        )}
        <figcaption className="bg-muted/50 text-muted-foreground border-border border-t px-3 py-1.5 text-xs">{shot.name}</figcaption>
    </figure>
);

const SectionLabel = ({ children }: { children: ReactNode }) => <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{children}</p>;

const Section = ({ children, label }: { children: ReactNode; label: string }) => (
    <div className="space-y-1.5">
        <SectionLabel>{label}</SectionLabel>
        {children}
    </div>
);

interface FindingCardProps {
    finding: Finding;
    index: number;
}

const FindingCard = ({ finding, index }: FindingCardProps) => {
    const style = getSeverityStyle(finding.severity);

    return (
        <Card
            className={cn('scroll-mt-24 gap-0 overflow-hidden border-l-4 py-0', style.borderClass)}
            id={finding.id}
        >
            <header className={cn('px-4 py-3', style.rowClass)}>
                <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={finding.severity} />
                    {typeof finding.cvss === 'number' && (
                        <Badge
                            className="bg-background/70 font-mono"
                            variant="secondary"
                        >
                            CVSS {finding.cvss.toFixed(1)}
                        </Badge>
                    )}
                    {finding.cve && (
                        <Badge
                            className="bg-background/70 font-mono"
                            variant="outline"
                        >
                            {finding.cve}
                        </Badge>
                    )}
                </div>
                <h3 className="text-foreground mt-2 text-base leading-snug font-semibold">
                    {index}. {finding.title}
                </h3>
            </header>

            <dl className="bg-muted/40 border-border grid grid-cols-1 gap-x-4 gap-y-3 border-b px-4 py-3 sm:grid-cols-[6rem_8rem_1fr]">
                <div className="space-y-1">
                    <dt>
                        <SectionLabel>CVSS</SectionLabel>
                    </dt>
                    <dd className="text-foreground text-sm font-medium tabular-nums">{typeof finding.cvss === 'number' ? finding.cvss.toFixed(1) : '—'}</dd>
                </div>
                <div className="space-y-1">
                    <dt>
                        <SectionLabel>Risk Rating</SectionLabel>
                    </dt>
                    <dd className={cn('text-sm font-semibold', style.textClass)}>{style.label}</dd>
                </div>
                <div className="min-w-0 space-y-1">
                    <dt>
                        <SectionLabel>Affected URL{(finding.affectedUrls?.length ?? 0) > 1 ? 's' : ''}</SectionLabel>
                    </dt>
                    <dd>
                        {finding.affectedUrls && finding.affectedUrls.length > 0 ? (
                            <ul className="space-y-1">
                                {finding.affectedUrls.map((url, i) => (
                                    <li
                                        className="flex items-center gap-2"
                                        key={`${finding.id}-url-${i}`}
                                    >
                                        <span className="text-foreground/80 min-w-0 flex-1 truncate font-mono text-xs">{url}</span>
                                        <CopyButton value={url} />
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                        )}
                    </dd>
                </div>
            </dl>

            <div className="space-y-4 px-4 py-4 text-sm">
                {finding.description && (
                    <Section label="Details of Vulnerability">
                        <Markdown
                            className="text-muted-foreground"
                            disableHeadingIds
                        >
                            {finding.description}
                        </Markdown>
                    </Section>
                )}

                {finding.stepsToReproduce && finding.stepsToReproduce.length > 0 && (
                    <Section label="Steps to Reproduce">
                        <ol className="text-muted-foreground space-y-1.5">
                            {finding.stepsToReproduce.map((step, i) => (
                                <li
                                    className="flex gap-2"
                                    key={`${finding.id}-step-${i}`}
                                >
                                    <span className="text-foreground/70 min-w-4 font-medium tabular-nums">{i + 1}.</span>
                                    <span className="min-w-0 flex-1">{step}</span>
                                </li>
                            ))}
                        </ol>
                    </Section>
                )}

                {finding.evidence && (
                    <Section label="Evidence">
                        <div className="border-border bg-muted/30 rounded-md border p-3">
                            <Markdown
                                className="text-muted-foreground"
                                disableHeadingIds
                            >
                                {finding.evidence}
                            </Markdown>
                        </div>
                    </Section>
                )}

                {finding.screenshots && finding.screenshots.length > 0 && (
                    <Section label="Evidence Screenshots">
                        <div className="grid gap-3 sm:grid-cols-2">
                            {finding.screenshots.map((shot) => (
                                <ScreenshotView
                                    key={shot.id}
                                    shot={shot}
                                />
                            ))}
                        </div>
                    </Section>
                )}

                {finding.impact && finding.impact.length > 0 && (
                    <Section label="Impact">
                        <ul className="text-muted-foreground space-y-1.5">
                            {finding.impact.map((item, i) => (
                                <li
                                    className="flex gap-2"
                                    key={`${finding.id}-impact-${i}`}
                                >
                                    <span className="text-foreground/40 select-none">•</span>
                                    <span className="min-w-0 flex-1">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </Section>
                )}

                {finding.recommendation && (
                    <Section label="Remediation">
                        <div className="flex gap-2 rounded-md border border-teal-200 bg-teal-50 p-3 dark:border-teal-900 dark:bg-teal-950/30">
                            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-teal-700 dark:text-teal-400" />
                            <Markdown
                                className="text-teal-900 dark:text-teal-100"
                                disableHeadingIds
                            >
                                {finding.recommendation}
                            </Markdown>
                        </div>
                    </Section>
                )}

                {finding.references && finding.references.length > 0 && (
                    <Section label="References">
                        <ul className="space-y-1">
                            {finding.references.map((ref, i) => (
                                <li key={`${finding.id}-ref-${i}`}>
                                    <a
                                        className="text-primary inline-flex items-center gap-1 break-all hover:underline"
                                        href={ref}
                                        rel="noreferrer"
                                        target="_blank"
                                    >
                                        <ExternalLink className="size-3 shrink-0" />
                                        <span className="text-xs">{ref}</span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </Section>
                )}
            </div>
        </Card>
    );
};

export default FindingCard;
