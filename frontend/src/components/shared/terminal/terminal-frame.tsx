import { Check, Copy, SquareTerminal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

// Robust copy: the async Clipboard API is unavailable in non-secure contexts and
// can be blocked by permissions (failing silently), so fall back to a hidden
// <textarea> + execCommand('copy'), which works everywhere.
const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);

            return true;
        }
    } catch {
        /* fall through to the legacy path */
    }

    try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.top = '0';
        textarea.style.left = '0';
        textarea.style.opacity = '0';
        textarea.style.pointerEvents = 'none';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);

        return ok;
    } catch {
        return false;
    }
};

/** Small copy-to-clipboard button styled for the dark terminal chrome. */
export const TerminalCopyButton = ({ className, text }: { className?: string; text: string }) => {
    const [copied, setCopied] = useState(false);
    const resetRef = useRef<null | ReturnType<typeof setTimeout>>(null);

    useEffect(
        () => () => {
            if (resetRef.current) {
                clearTimeout(resetRef.current);
            }
        },
        [],
    );

    const handleCopy = async () => {
        const ok = await copyToClipboard(text);

        if (!ok) {
            return;
        }

        setCopied(true);

        if (resetRef.current) {
            clearTimeout(resetRef.current);
        }

        resetRef.current = setTimeout(() => setCopied(false), 1500);
    };

    return (
        <button
            className={cn(
                'term-chrome-btn flex items-center gap-1 rounded-md px-1.5 py-1 font-mono text-[11px] transition-colors',
                className,
            )}
            onClick={handleCopy}
            title="Copy terminal output"
            type="button"
        >
            {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
            {copied ? 'Copied' : 'Copy'}
        </button>
    );
};

/**
 * Presentational "terminal window" chrome shared by the xterm view and the
 * per-step command view: a dark surface (`.terminal-scope` supplies the palette),
 * a header with traffic-light dots, a title, and an optional Copy button. Keeping
 * this in one place makes every terminal surface look identical and premium.
 */
export const TerminalFrame = ({
    bodyClassName,
    children,
    className,
    copyText,
    title,
}: {
    bodyClassName?: string;
    children: React.ReactNode;
    className?: string;
    copyText?: string;
    title: string;
}) => {
    return (
        <div className={cn('terminal-scope flex flex-col overflow-hidden rounded-lg border shadow-sm', className)}>
            <div className="term-chrome-bar flex items-center gap-2 px-3 py-2">
                <span className="flex gap-1.5">
                    <span className="bg-border-strong size-2.5 rounded-full" />
                    <span className="bg-border-strong size-2.5 rounded-full" />
                    <span className="bg-border-strong size-2.5 rounded-full" />
                </span>
                <span className="term-chrome-title ml-1 flex min-w-0 items-center gap-1.5 font-mono text-xs font-medium">
                    <SquareTerminal className="size-3.5 shrink-0" />
                    <span className="truncate">{title}</span>
                </span>
                {copyText != null && (
                    <TerminalCopyButton
                        className="ml-auto"
                        text={copyText}
                    />
                )}
            </div>
            <div className={cn('relative min-h-0 grow overflow-hidden', bodyClassName)}>{children}</div>
        </div>
    );
};
