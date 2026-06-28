import { Check, Copy, ExternalLink, ImageOff, ShieldCheck } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import type { Finding, ReportScreenshot } from '@/lib/report-model';

import Markdown from '@/components/shared/markdown';
import { SeverityBadge } from '@/components/shared/severity-badge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
            {copied ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
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

const FieldLabel = ({ children }: { children: ReactNode }) => <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{children}</p>;

interface FindingCardProps {
    finding: Finding;
}

const FindingCard = ({ finding }: FindingCardProps) => {
    const style = getSeverityStyle(finding.severity);

    return (
        <Card
            className={cn('scroll-mt-24 gap-4 border-l-4', style.borderClass)}
            id={finding.id}
        >
            <CardHeader className="gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={finding.severity} />
                    {typeof finding.cvss === 'number' && (
                        <Badge
                            className="font-mono"
                            variant="secondary"
                        >
                            CVSS {finding.cvss.toFixed(1)}
                        </Badge>
                    )}
                    {finding.cve && (
                        <Badge
                            className="font-mono"
                            variant="outline"
                        >
                            {finding.cve}
                        </Badge>
                    )}
                </div>
                <CardTitle className="text-base leading-snug">{finding.title}</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 text-sm">
                {finding.affectedUrls && finding.affectedUrls.length > 0 && (
                    <div className="space-y-1.5">
                        <FieldLabel>Affected URL{finding.affectedUrls.length > 1 ? 's' : ''}</FieldLabel>
                        <ul className="space-y-1">
                            {finding.affectedUrls.map((url, i) => (
                                <li
                                    className="bg-muted/50 flex items-center gap-2 rounded px-2 py-1"
                                    key={`${finding.id}-url-${i}`}
                                >
                                    <span className="text-foreground/80 min-w-0 flex-1 truncate font-mono text-xs">{url}</span>
                                    <CopyButton value={url} />
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {finding.description && (
                    <Markdown
                        className="text-muted-foreground"
                        disableHeadingIds
                    >
                        {finding.description}
                    </Markdown>
                )}

                {finding.evidence && (
                    <div className="space-y-1.5">
                        <FieldLabel>Evidence</FieldLabel>
                        <div className="border-border bg-muted/30 rounded-md border p-3">
                            <Markdown
                                className="text-muted-foreground"
                                disableHeadingIds
                            >
                                {finding.evidence}
                            </Markdown>
                        </div>
                    </div>
                )}

                {finding.recommendation && (
                    <div className="space-y-1.5">
                        <FieldLabel>Recommendation</FieldLabel>
                        <div className="flex gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
                            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <Markdown
                                className="text-emerald-900 dark:text-emerald-200"
                                disableHeadingIds
                            >
                                {finding.recommendation}
                            </Markdown>
                        </div>
                    </div>
                )}

                {finding.screenshots && finding.screenshots.length > 0 && (
                    <div className="space-y-1.5">
                        <FieldLabel>Evidence Screenshots</FieldLabel>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {finding.screenshots.map((shot) => (
                                <ScreenshotView
                                    key={shot.id}
                                    shot={shot}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {finding.references && finding.references.length > 0 && (
                    <div className="space-y-1.5">
                        <FieldLabel>References</FieldLabel>
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
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default FindingCard;
