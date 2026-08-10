import { Fragment, memo, useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * Content-aware terminal highlighter for HTML-rendered output (the per-command
 * panes). It detects what each line *is* — JSON, HTML/XML, a key: value line, or
 * plain text — and colours it with a coherent, meaning-based palette (see
 * TERMINAL_LEGEND). Colour is spent on structure/values, while the bulk of prose
 * output stays a calm neutral so the console reads clean, not like a rainbow.
 *
 * Palette (by meaning, shared across content types):
 *   teal   → commands, JSON keys, HTML tags, key: names   (identifiers/structure)
 *   blue   → strings & values (shell strings, JSON strings, HTML attr values)
 *   copper → numbers, HTML attribute names
 *   violet → JSON booleans / null
 *   orange → URLs and the values they point at            (the intended "pop")
 *   green / red / amber → success / error / warning lines
 *   gray   → comments, dividers, punctuation, redaction markers
 *
 * Colours live in `.term-*` classes (index.css, `.terminal-scope`).
 */

interface Segment {
    cls?: string;
    text: string;
}

// Strip ANSI SGR sequences — the backend wraps stdout/stdin in colour codes we
// re-derive semantically here. (ESC control char is intentional.)
// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;]*m/g;

export const stripAnsi = (text: string): string => text.replace(ANSI_RE, '');

// --- Display bounds -------------------------------------------------------
// A single command's output can be tens of MB (e.g. a dumped minified JS bundle,
// frequently on a single line). Tokenising that on the main thread freezes the tab,
// so the highlighted HTML *preview* is computed on a bounded slice only. The COMPLETE
// output is never modified — it stays in the DB and is shown verbatim in the Raw
// (xterm) tab and via the copy button.
const MAX_PREVIEW_CHARS = 100_000; // per source entry, before highlighting
const MAX_LINE_CHARS = 4_000; // longest single line we tokenise/render
const MAX_FLAT_LINES = 5_000; // most display lines we build for one block
const MAX_SCAN_LINES = 2_000; // lines sampled for content-type detection

// ---------------------------------------------------------------------------
// Token matchers
// ---------------------------------------------------------------------------
const URL_REDACT = String.raw`(?<url>https?:\/\/[^\s"'\`<>]+)|(?<redact>§\*+[^§\n]*?\*+§?)`;
const OUTPUT_RE = new RegExp(URL_REDACT, 'g');
const COMMAND_RE = new RegExp(`${URL_REDACT}|(?<str>"[^"\\n]*"|'[^'\\n]*')|(?<flag>(?<=^|\\s)--?[A-Za-z][\\w-]*)`, 'g');
// JSON, tokenized in place (no reformat): keys before ':' win over plain strings.
const JSON_RE =
    /(?<key>"(?:[^"\\]|\\.)*"(?=\s*:))|(?<str>"(?:[^"\\]|\\.)*")|(?<bool>\b(?:true|false|null)\b)|(?<num>-?\b\d[\d.eE+-]*\b)|(?<punct>[{}[\],:])/g;
// HTML/XML: tag delimiters + names, attribute names, and quoted attribute values.
const HTML_RE =
    /(?<tagname><\/?[a-zA-Z!][\w:-]*)|(?<str>"[^"]*"|'[^']*')|(?<attr>[a-zA-Z-][\w-]*(?==))|(?<punct>\/?>)/g;

const walk = (text: string, re: RegExp, classer: (g: Record<string, string | undefined>) => string): Segment[] => {
    const segments: Segment[] = [];
    let last = 0;

    re.lastIndex = 0;
    let match: null | RegExpExecArray;

    while ((match = re.exec(text)) !== null) {
        if (match.index > last) {
            segments.push({ text: text.slice(last, match.index) });
        }

        segments.push({ cls: classer(match.groups ?? {}), text: match[0] });
        last = match.index + match[0].length;

        if (match[0].length === 0) {
            re.lastIndex++;
        }
    }

    if (last < text.length) {
        segments.push({ text: text.slice(last) });
    }

    return segments;
};

const textClass = (g: Record<string, string | undefined>): string =>
    g.url ? 'term-url' : g.redact ? 'term-redact' : g.str ? 'term-str' : 'term-flag';
const jsonClass = (g: Record<string, string | undefined>): string =>
    g.key ? 'term-cmd' : g.str ? 'term-str' : g.bool ? 'term-bool' : g.num ? 'term-num' : 'term-punct';
const htmlClass = (g: Record<string, string | undefined>): string =>
    g.tagname ? 'term-cmd' : g.str ? 'term-str' : g.attr ? 'term-num' : 'term-punct';

// ---------------------------------------------------------------------------
// Per-line content detection
// ---------------------------------------------------------------------------
const JSON_KEY = /"(?:[^"\\]|\\.)*"\s*:/;
const JSON_PUNCT_LINE = /^\s*[{}[\],]+\s*$/;
const HTML_TAG = /<\/?[a-zA-Z!][\w:-]*(\s|>|\/)/;
const KV_KEY = /^(\s*)([A-Za-z][A-Za-z0-9_-]{0,30})(:\s)/;

type LineType = 'html' | 'json' | 'text';

const detectLine = (text: string): LineType => {
    if (JSON_KEY.test(text) || JSON_PUNCT_LINE.test(text)) {
        return 'json';
    }

    if (HTML_TAG.test(text)) {
        return 'html';
    }

    return 'text';
};

/** Dominant content type of a whole output block — used for the pane's type badge. */
export const detectBlockType = (texts: string[]): LineType => {
    let json = 0;
    let html = 0;
    let scanned = 0;

    for (const t of texts) {
        // Sample only the head of very large outputs — enough to classify without
        // regex-scanning tens of MB (a dumped JS bundle would otherwise freeze the tab).
        const sample = t.length > MAX_PREVIEW_CHARS ? t.slice(0, MAX_PREVIEW_CHARS) : t;

        for (const rawLine of stripAnsi(sample).split('\n')) {
            const line = rawLine.length > MAX_LINE_CHARS ? rawLine.slice(0, MAX_LINE_CHARS) : rawLine;
            const kind = detectLine(line);

            if (kind === 'json') {
                json++;
            } else if (kind === 'html') {
                html++;
            }

            if (++scanned >= MAX_SCAN_LINES) {
                return json === 0 && html === 0 ? 'text' : json >= html ? 'json' : 'html';
            }
        }
    }

    if (json === 0 && html === 0) {
        return 'text';
    }

    return json >= html ? 'json' : 'html';
};

const DIVIDER_RE = /^\s*[-=_*~]{3,}\s*$/;
const SUCCESS_RE = /(^|\s)(→|✓|✔|\[ok\]|success(ful)?|passed|completed|confirmed|enabled|granted|valid\b)/i;
const ERROR_RE =
    /(error|fail(ed|ure)?|denied|refus|invalid|unauthoriz|forbidden|fatal|traceback|exception|not found|no such|cannot|permission denied)/i;
const WARN_RE = /(warn(ing)?|deprecat|timed? ?out|skipp|retry|retrying|not blocked)/i;
// A zeroed / negated count is a healthy result, not a problem — "0 errors",
// "no warnings", "none failed" must not paint the whole line red or amber. Checked
// before ERROR/WARN so a clean summary line reads as success. One extra test only
// on lines that aren't already classified, so this adds no meaningful cost.
const NEGATED_COUNT_RE =
    /(^|\s)(0|no|none|zero|without)\s+(errors?|failures?|faults?|warnings?|issues?|problems?|vulnerabilit(?:y|ies))\b/i;

const textLineBase = (text: string): string | undefined => {
    if (/^\s*#/.test(text)) {
        return 'term-comment';
    }

    if (DIVIDER_RE.test(text)) {
        return 'term-divider';
    }

    if (SUCCESS_RE.test(text)) {
        return 'term-success';
    }

    if (NEGATED_COUNT_RE.test(text)) {
        return 'term-success';
    }

    if (ERROR_RE.test(text)) {
        return 'term-error';
    }

    if (WARN_RE.test(text)) {
        return 'term-warn';
    }

    return undefined;
};

const renderSegments = (segments: Segment[]) =>
    segments.map((seg, i) => (
        <Fragment key={i}>{seg.cls ? <span className={seg.cls}>{seg.text}</span> : seg.text}</Fragment>
    ));

// Render one output line by its detected content type.
const renderOutputLine = (clean: string, isErr: boolean) => {
    const type = detectLine(clean);

    if (type === 'json') {
        return renderSegments(walk(clean, JSON_RE, jsonClass));
    }

    if (type === 'html') {
        return renderSegments(walk(clean, HTML_RE, htmlClass));
    }

    // plain text: colour a leading `key:` then inline URLs/redactions.
    const kv = isErr ? null : KV_KEY.exec(clean);

    if (kv) {
        const rest = clean.slice(kv[0].length);

        return (
            <>
                {kv[1]}
                <span className="term-cmd">{kv[2]}</span>
                {kv[3]}
                {renderSegments(walk(rest, OUTPUT_RE, textClass))}
            </>
        );
    }

    return renderSegments(walk(clean, OUTPUT_RE, textClass));
};

// Stagger cap so live-appended / long output never waits absurdly long.
const lineDelay = (index: number): string => `${Math.min(index, 22) * 34}ms`;

// Flatten source log entries into individual display lines. A single stdout/stderr
// log can contain many `\n`-separated lines (e.g. a whole curl verbose dump), and
// each must be detected + coloured on its own — otherwise one keyword or one `<`
// would tint an entire block.
const flattenLines = (lines: { isErr: boolean; text: string }[]): { isErr: boolean; text: string }[] => {
    const flat: { isErr: boolean; text: string }[] = [];

    for (const line of lines) {
        // Bound the raw text and each line before tokenising: a single command's output
        // can be tens of MB (often on one line, e.g. a minified JS bundle), and
        // highlighting that on the main thread freezes the tab. The full text is
        // preserved in the DB, the Raw (xterm) tab, and the copy button.
        const raw = line.text.length > MAX_PREVIEW_CHARS ? line.text.slice(0, MAX_PREVIEW_CHARS) : line.text;

        for (const sub of stripAnsi(raw).split('\n')) {
            flat.push({
                isErr: line.isErr,
                text:
                    sub.length > MAX_LINE_CHARS
                        ? `${sub.slice(0, MAX_LINE_CHARS)} … [line truncated — full text in Raw tab]`
                        : sub,
            });

            if (flat.length >= MAX_FLAT_LINES) {
                return flat;
            }
        }
    }

    return flat;
};

// Lines highlighted eagerly on first paint. Both output containers scroll inside a fixed
// box — CommandPane is max-h-[26rem] (~23 lines) and TermOutputCard is max-h-[320px]
// (~17 lines) — so 24 comfortably covers either box's initial fold: whatever is visible on
// load is coloured immediately, with no plain→highlighted flash. Everything past this
// renders as plain text and upgrades in place as it scrolls into view.
const EAGER_LINES = 24;
// The observer root is the viewport (each output box scrolls inside its own overflow-auto
// container, which the observer still respects). This margin therefore preloads a whole
// output box just before it scrolls into the outer view; a line revealed by scrolling
// *within* a single box upgrades as it enters that box (one frame behind, self-healing).
const HIGHLIGHT_ROOT_MARGIN = '400px';

/**
 * One output line. It renders as plain text until it is near the viewport, then upgrades
 * to the content-aware highlighted render *in place* — the wrapper <div> (className, key,
 * style) is byte-identical across the flip, so the one-shot fade-in never re-fires. The
 * full plain text is in the DOM from first paint, so find-in-page and the copy button
 * always see the complete output, and the `base` line colour (success/error/warn) is on
 * the wrapper so it shows immediately; only the per-token tokenising is deferred. That
 * deferral — the expensive part — is what stops a flow with many command panes from
 * stalling on load. If IntersectionObserver is unavailable (SSR / jsdom / very old
 * browsers) every line highlights eagerly, identical to the previous behaviour.
 *
 * Memoised on its (primitive) props: live output arrives via subscription, which
 * re-renders the whole pane on every appended line. Without this, every already-
 * rendered line re-runs the tokeniser each tick even though its text is unchanged;
 * memo keeps highlighting proportional to *new* lines, not the whole visible buffer.
 * This is what keeps accuracy improvements from costing anything at render time.
 */
const TermLine = memo(
    ({
        base,
        delay,
        eager,
        isErr,
        text,
    }: {
        base: string | undefined;
        delay: string;
        eager: boolean;
        isErr: boolean;
        text: string;
    }) => {
        const [lit, setLit] = useState(eager || typeof IntersectionObserver === 'undefined');
        const ref = useRef<HTMLDivElement>(null);

        useEffect(() => {
            if (lit) {
                return;
            }

            // IntersectionObserver-unavailable (SSR / jsdom / old browsers) is already handled
            // by the initial `lit` state, so past the `if (lit)` guard IO is always defined and
            // the committed ref is always set; `!el` is just a type guard.
            const el = ref.current;

            if (!el) {
                return;
            }

            const observer = new IntersectionObserver(
                (entries) => {
                    if (entries.some((entry) => entry.isIntersecting)) {
                        setLit(true);
                        observer.disconnect();
                    }
                },
                { rootMargin: HIGHLIGHT_ROOT_MARGIN },
            );

            observer.observe(el);

            return () => observer.disconnect();
        }, [lit]);

        return (
            <div
                className={cn('term-line break-all whitespace-pre-wrap', base)}
                ref={ref}
                style={{ animationDelay: delay }}
            >
                {lit ? renderOutputLine(text, isErr) : text}
            </div>
        );
    },
);

TermLine.displayName = 'TermLine';

/**
 * A command's output block: each line detected + coloured by content type, with a
 * subtle staggered fade-in so output reads as if it is streaming in one line at a
 * time. `isErr` lines (stderr) read red.
 *
 * `maxLines` caps how many lines are rendered (one <div> each — there is no
 * virtualization here) so a huge output can't flood the DOM; the overflow count is
 * shown as a trailing note. The full text is still available via the copy button and
 * the Raw terminal tab. Off-screen lines are highlighted lazily as they scroll into
 * view (see TermLine) so a flow with many panes doesn't stall on load.
 */
export const TermOutput = ({ lines, maxLines }: { lines: { isErr: boolean; text: string }[]; maxLines?: number }) => {
    // Re-split the source logs only when they change, not on every parent re-render;
    // callers pass a memoised `lines`, so streaming a new pane elsewhere no longer
    // re-flattens this one's whole preview.
    const flat = useMemo(() => flattenLines(lines), [lines]);
    const hidden = maxLines != null && flat.length > maxLines ? flat.length - maxLines : 0;
    const shown = hidden > 0 ? flat.slice(0, maxLines) : flat;

    return (
        <>
            {shown.map((line, i) => (
                <TermLine
                    base={line.isErr ? 'term-error' : textLineBase(line.text)}
                    delay={lineDelay(i)}
                    eager={i < EAGER_LINES}
                    isErr={line.isErr}
                    // output lines are positional and have no stable id
                    key={i}
                    text={line.text}
                />
            ))}
            {hidden > 0 ? <div className="term-muted mt-1 select-none">+{hidden} more lines</div> : null}
        </>
    );
};

/**
 * A highlighted command block. Multi-line commands are split; a `#` line is a
 * comment, otherwise the first word is the command name and the remainder is
 * tokenized (flags, strings, URLs, redactions).
 */
export const TermCommandLines = ({ text }: { text: string }) => {
    const lines = stripAnsi(text).split('\n');

    return (
        <>
            {lines.map((line, i) => {
                if (/^\s*#/.test(line)) {
                    return (
                        <div
                            className="term-comment break-all whitespace-pre-wrap"
                            key={i}
                        >
                            {line}
                        </div>
                    );
                }

                const cmdMatch = /^(\s*)([\w./-]+)([\s\S]*)$/.exec(line);

                if (!cmdMatch) {
                    return (
                        <div
                            className="break-all whitespace-pre-wrap"
                            key={i}
                        >
                            {renderSegments(walk(line, COMMAND_RE, textClass))}
                        </div>
                    );
                }

                const [, lead, cmd, rest] = cmdMatch;

                return (
                    <div
                        className="break-all whitespace-pre-wrap"
                        key={i}
                    >
                        {lead}
                        <span className="term-cmd">{cmd}</span>
                        {renderSegments(walk(rest, COMMAND_RE, textClass))}
                    </div>
                );
            })}
        </>
    );
};
