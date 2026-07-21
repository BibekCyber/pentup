import type { ITerminalOptions, ITheme } from '@xterm/xterm';

export const TERMINAL_OPTIONS: ITerminalOptions = {
    allowProposedApi: true,
    allowTransparency: true,
    convertEol: true,
    cursorBlink: false,
    customGlyphs: true,
    disableStdin: true,
    fastScrollSensitivity: 10,
    fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: 12,
    fontWeight: 600,
    logLevel: 'off',
    screenReaderMode: false,
    scrollback: 10_000,
    smoothScrollDuration: 0,
} as const;

// Premium RankLocal terminal — a recessed cool-graphite "well" (harmonizes with the
// dark app theme) with a RESTRAINED, professional palette from the oklch design panel.
// The crucial move: the backend wraps ALL stdout in ANSI bright-green (SGR 92) and
// commands/prompt in bright-cyan (SGR 96). So bright-green is remapped to a calm
// near-neutral (#c9ced6) — this dissolves the "neon green wall" and turns stdout into
// quiet body text — while bright-cyan becomes one refined teal command accent. Real
// green/red/yellow stay reserved for success/error/warning. Kept dark in both app
// themes, the way premium editors keep their integrated terminal dark. Surface is
// exported so the frame chrome (.terminal-scope) matches it seamlessly.
export const TERMINAL_SURFACE = '#0B0D10';

const RANKLOCAL_TERMINAL: ITheme = {
    background: TERMINAL_SURFACE,
    black: '#3f454e',
    blue: '#8fb3cf',
    brightBlack: '#5b616b',
    brightBlue: '#a9c4da',
    brightCyan: '#59b6a6', // commands/prompt (SGR 96) — one calm teal accent
    brightGreen: '#c9ced6', // stdout wrapper (SGR 92) → calm neutral, NOT neon
    brightMagenta: '#c9a3ff',
    brightRed: '#ef7a70',
    brightWhite: '#eef1f5',
    brightYellow: '#e9bd6e',
    cursor: '#F57214',
    cursorAccent: '#0B0D10',
    cyan: '#59b6a6',
    foreground: '#cdd2d9',
    green: '#63c28d', // real success green
    magenta: '#b48ce0',
    red: '#ef7a70',
    selectionBackground: 'rgba(242, 136, 62, 0.22)',
    white: '#cdd2d9',
    yellow: '#e9bd6e',
} as const;

const DARK_SEARCH_DECORATIONS = {
    activeMatchBackground: '#AAAAAA',
    activeMatchColorOverviewRuler: '#000000',
    matchBackground: '#666666',
    matchOverviewRuler: '#000000',
} as const;

// The terminal is always the premium dark surface (in both light and dark app
// themes), so the search-match decorations are always the dark set.
export function getSearchDecorations() {
    return DARK_SEARCH_DECORATIONS;
}

export function getTerminalTheme(): ITheme {
    return RANKLOCAL_TERMINAL;
}
