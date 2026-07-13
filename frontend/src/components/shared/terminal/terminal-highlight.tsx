import { Fragment } from 'react';

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

// ---------------------------------------------------------------------------
// Token matchers
// ---------------------------------------------------------------------------
const URL_REDACT = String.raw`(?<url>https?:\/\/[^\s"'\`<>]+)|(?<redact>§\*+[^§\n]*?\*+§?)`;
const OUTPUT_RE = new RegExp(URL_REDACT, 'g');
const COMMAND_RE = new RegExp(
    `${URL_REDACT}|(?<str>"[^"\\n]*"|'[^'\\n]*')|(?<flag>(?<=^|\\s)--?[A-Za-z][\\w-]*)`,
    'g',
);
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

    for (const t of texts) {
        for (const line of stripAnsi(t).split('\n')) {
            const kind = detectLine(line);

            if (kind === 'json') {
                json++;
            } else if (kind === 'html') {
                html++;
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
const ERROR_RE = /(error|fail(ed|ure)?|denied|refus|invalid|unauthoriz|forbidden|fatal|traceback|exception|not found|no such|cannot|permission denied)/i;
const WARN_RE = /(warn(ing)?|deprecat|timed? ?out|skipp|retry|retrying|not blocked)/i;

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
        for (const sub of stripAnsi(line.text).split('\n')) {
            flat.push({ isErr: line.isErr, text: sub });
        }
    }

    return flat;
};

/**
 * A command's output block: each line detected + coloured by content type, with a
 * subtle staggered fade-in so output reads as if it is streaming in one line at a
 * time. `isErr` lines (stderr) read red.
 */
export const TermOutput = ({ lines }: { lines: { isErr: boolean; text: string }[] }) => (
    <>
        {flattenLines(lines).map((line, i) => {
            const base = line.isErr ? 'term-error' : textLineBase(line.text);

            return (
                <div
                    className={cn('term-line break-all whitespace-pre-wrap', base)}
                    // output lines are positional and have no stable id
                    key={i}
                    style={{ animationDelay: lineDelay(i) }}
                >
                    {renderOutputLine(line.text, line.isErr)}
                </div>
            );
        })}
    </>
);

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
