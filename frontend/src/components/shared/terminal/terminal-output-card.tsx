import { cn } from '@/lib/utils';

import { TerminalCopyButton } from './terminal-frame';
import { detectBlockType, stripAnsi, TermOutput } from './terminal-highlight';

const TYPE_BADGE_LABEL: Record<string, string> = { html: 'HTML', json: 'JSON', text: 'TEXT' };

// Cap the number of rendered output lines. Unlike xterm (which virtualises rows),
// this renders one <div> per line, so a very large expanded result is bounded to
// keep the DOM cheap; the copy button still yields the full text.
const MAX_LINES = 300;

/**
 * The terminal's slim chrome bar: a terminal glyph, an optional content-type badge
 * (JSON / HTML), and a copy button. Shared by the live terminal's command panes and
 * by TermOutputCard so the two never drift apart.
 */
export const TermChromeBar = ({ blockType, copyText }: { blockType?: null | string; copyText: string }) => {
    const badge = blockType && blockType !== 'text' ? TYPE_BADGE_LABEL[blockType] : null;

    return (
        <div className="term-chrome-bar flex items-center gap-2 px-3 py-1.5">
            <span className="term-muted rounded border border-white/10 px-1.5 py-px font-mono text-[9px] tracking-[0.1em] uppercase">
                SHELL
            </span>
            {badge ? <span className="term-type-badge">{badge}</span> : null}
            <TerminalCopyButton
                className="ml-auto"
                text={copyText}
            />
        </div>
    );
};

/**
 * A self-contained terminal output card: the chrome bar over the content-coloured,
 * scrollable output. This is the same treatment the live terminal gives each command
 * pane, reused wherever we surface raw command / tool output outside the terminal
 * (e.g. a message's "Show details"), so those outputs read exactly like the terminal
 * — colour-coded (commands, URLs, JSON, HTML, errors…) on the dark terminal surface
 * — instead of as flat, unstyled text.
 */
export const TermOutputCard = ({ className, text }: { className?: string; text: string }) => {
    const clean = stripAnsi(text ?? '');
    const blockType = detectBlockType([clean]);

    return (
        <div className={cn('terminal-scope overflow-hidden rounded-lg border', className)}>
            <TermChromeBar
                blockType={blockType}
                copyText={clean}
            />
            <div className="max-h-[320px] overflow-auto p-3 font-mono text-xs leading-relaxed">
                <TermOutput
                    lines={[{ isErr: false, text: text ?? '' }]}
                    maxLines={MAX_LINES}
                />
            </div>
        </div>
    );
};
