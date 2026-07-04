import { StyleSheet, Text, View } from '@react-pdf/renderer';
import { marked } from 'marked';

export const markdownPdfStyles = StyleSheet.create({
    bold: {
        fontFamily: 'Helvetica-Bold',
    },
    code: {
        color: '#475569',
        fontFamily: 'Courier',
        fontSize: 9.5,
    },
    codeBlock: {
        backgroundColor: '#1e293b',
        borderColor: '#334155',
        borderRadius: 4,
        borderWidth: 1,
        color: '#e2e8f0',
        fontFamily: 'Courier',
        fontSize: 8.5,
        lineHeight: 1.4,
        marginBottom: 8,
        marginTop: 4,
        padding: 8,
    },
    h1: {
        color: '#0f172a',
        fontFamily: 'Helvetica-Bold',
        fontSize: 15,
        marginBottom: 8,
        marginTop: 6,
    },
    h2: {
        color: '#1e293b',
        fontFamily: 'Helvetica-Bold',
        fontSize: 13,
        marginBottom: 6,
        marginTop: 10,
    },
    h3: {
        color: '#334155',
        fontFamily: 'Helvetica-Bold',
        fontSize: 12,
        marginBottom: 5,
        marginTop: 8,
    },
    h4: {
        color: '#475569',
        fontFamily: 'Helvetica-Bold',
        fontSize: 11,
        marginBottom: 4,
        marginTop: 6,
    },
    h5: {
        color: '#64748b',
        fontFamily: 'Helvetica-Bold',
        fontSize: 10.5,
        marginBottom: 4,
        marginTop: 6,
    },
    h6: {
        color: '#94a3b8',
        fontFamily: 'Helvetica-Bold',
        fontSize: 10,
        marginBottom: 4,
        marginTop: 6,
    },
    hr: {
        borderBottomColor: '#e2e8f0',
        borderBottomWidth: 1,
        marginBottom: 10,
        marginTop: 10,
    },
    italic: {
        fontFamily: 'Helvetica-Oblique',
    },
    link: {
        color: '#2563eb',
        textDecoration: 'underline',
    },
    list: {
        marginBottom: 6,
        marginTop: 4,
    },
    listBullet: {
        color: '#64748b',
        fontSize: 10,
        marginRight: 6,
        minWidth: 16,
    },
    listContent: {
        color: '#334155',
        flex: 1,
        fontSize: 10.5,
        lineHeight: 1.5,
    },
    listItem: {
        alignItems: 'flex-start',
        flexDirection: 'row',
        marginBottom: 3,
        marginLeft: 12,
    },
    paragraph: {
        color: '#334155',
        fontSize: 10.5,
        lineHeight: 1.55,
        marginBottom: 7,
    },
});

// Standard Helvetica (the PDF base font) is Latin-1 only, so emoji and many symbols
// render as mojibake. The agent uses them heavily in conversational/assistant output.
// Map the few that carry meaning to ASCII tags, strip the rest.
const glyphMap: Record<string, string> = {
    '←': '<-',
    '→': '->',
    '↔': '<->',
    '⇒': '=>',
    '⏳': '[WAIT]',
    '⚠️': '[WARN]',
    '⚠': '[WARN]',
    '⛔': '[BLOCKED]',
    '✅': '[OK]',
    '✓': '[OK]',
    '✔': '[OK]',
    '✗': '[FAIL]',
    '✘': '[FAIL]',
    '❌': '[FAIL]',
    '➜': '->',
    '➡️': '->',
    '➡': '->',
    '🚫': '[BLOCKED]',
};

// Intentionally strips emoji building blocks (regional indicators, variation selectors,
// ZWJ) one codepoint at a time — that is exactly the misleading-class the rule warns about.
// eslint-disable-next-line no-misleading-character-class
const glyphStrip = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{21FF}\u{2500}-\u{259F}\u{FE00}-\u{FE0F}\u{200D}]/gu;

// stripGlyphs is safe for code (keeps markdown markers); sanitizeProse additionally
// removes leftover bold markers that marked could not pair (e.g. "** text **"), so they
// never render literally in the PDF.
const stripGlyphs = (text: string): string => {
    let result = text;

    for (const [glyph, replacement] of Object.entries(glyphMap)) {
        result = result.replaceAll(glyph, replacement);
    }

    return result.replace(glyphStrip, '');
};

const sanitizeProse = (text: string): string =>
    stripGlyphs(text)
        .replace(/\*\*|__/g, '')
        .replace(/ {2,}/g, ' ');

interface InlineToken {
    bold?: boolean;
    code?: boolean;
    italic?: boolean;
    link?: string;
    text: string;
}

interface ParsedContent {
    content?: string;
    inlineTokens?: InlineToken[];
    items?: Array<{ inlineTokens: InlineToken[] }>;
    level?: number;
    ordered?: boolean;
    type: string;
}

const parseInlineTokens = (text: string): InlineToken[] => {
    const tokens: InlineToken[] = [];
    const lexed = marked.lexer(text, { breaks: false });
    const firstToken = lexed[0];

    if (firstToken && firstToken.type === 'paragraph' && 'tokens' in firstToken) {
        const paragraphTokens =
            (firstToken as { tokens?: unknown[] }).tokens?.filter((token): token is Record<string, unknown> => typeof token === 'object' && token !== null) || [];

        paragraphTokens.forEach((token) => {
            switch (token.type) {
                case 'codespan': {
                    tokens.push({ code: true, text: stripGlyphs(String(token.text || '')) });
                    break;
                }

                case 'em': {
                    tokens.push({ italic: true, text: sanitizeProse(String(token.text || '')) });
                    break;
                }

                case 'link': {
                    tokens.push({ link: String(token.href || ''), text: sanitizeProse(String(token.text || '')) });
                    break;
                }

                case 'strong': {
                    tokens.push({ bold: true, text: sanitizeProse(String(token.text || '')) });
                    break;
                }

                default: {
                    if ('text' in token) {
                        tokens.push({ text: sanitizeProse(String(token.text || '')) });
                    }
                }
            }
        });
    } else {
        tokens.push({ text: sanitizeProse(text) });
    }

    return tokens;
};

const parseMarkdownTokens = (markdown: string): ParsedContent[] => {
    const tokens = marked.lexer(markdown);
    const result: ParsedContent[] = [];

    const processToken = (token: Record<string, unknown>): void => {
        switch (token.type) {
            case 'code': {
                result.push({ content: stripGlyphs(String(token.text || '')), type: 'code' });
                break;
            }

            case 'heading': {
                result.push({ inlineTokens: parseInlineTokens(String(token.text || '')), level: Number(token.depth || 1), type: 'heading' });
                break;
            }

            case 'hr': {
                result.push({ type: 'hr' });
                break;
            }

            case 'list': {
                const tokenItems = (Array.isArray(token.items) ? token.items : []) as Array<Record<string, unknown>>;
                const items = tokenItems.map((item) => ({ inlineTokens: parseInlineTokens(String(item.text || '')) }));
                result.push({ items, ordered: Boolean(token.ordered), type: 'list' });
                break;
            }

            case 'paragraph': {
                result.push({ inlineTokens: parseInlineTokens(String(token.text || '')), type: 'paragraph' });
                break;
            }

            case 'space': {
                break;
            }

            default: {
                if ('text' in token && typeof token.text === 'string') {
                    result.push({ inlineTokens: parseInlineTokens(token.text), type: 'paragraph' });
                }
            }
        }
    };

    tokens.forEach((token) => processToken(token as Record<string, unknown>));

    return result;
};

const renderInlineTokens = (tokens: InlineToken[], keyPrefix: string) =>
    tokens.map((token, idx) => {
        const appliedStyles = [];

        if (token.code) {
            appliedStyles.push(markdownPdfStyles.code);
        }

        if (token.bold) {
            appliedStyles.push(markdownPdfStyles.bold);
        }

        if (token.italic) {
            appliedStyles.push(markdownPdfStyles.italic);
        }

        if (token.link) {
            appliedStyles.push(markdownPdfStyles.link);
        }

        if (appliedStyles.length > 0) {
            return (
                <Text
                    key={`${keyPrefix}-inline-${idx}`}
                    style={appliedStyles}
                >
                    {token.text}
                </Text>
            );
        }

        return token.text;
    });

const renderPDFContent = (parsed: ParsedContent[]) =>
    parsed
        .map((item, index) => {
            switch (item.type) {
                case 'code': {
                    if (!item.content) {
                        return null;
                    }

                    return (
                        <Text
                            key={`code-${index}`}
                            style={markdownPdfStyles.codeBlock}
                        >
                            {item.content}
                        </Text>
                    );
                }

                case 'heading': {
                    if (!item.inlineTokens || item.inlineTokens.length === 0) {
                        return null;
                    }

                    const style =
                        item.level === 1
                            ? markdownPdfStyles.h1
                            : item.level === 2
                              ? markdownPdfStyles.h2
                              : item.level === 3
                                ? markdownPdfStyles.h3
                                : item.level === 4
                                  ? markdownPdfStyles.h4
                                  : item.level === 5
                                    ? markdownPdfStyles.h5
                                    : markdownPdfStyles.h6;

                    return (
                        <Text
                            key={`heading-${index}`}
                            style={style}
                        >
                            {renderInlineTokens(item.inlineTokens, `heading-${index}`)}
                        </Text>
                    );
                }

                case 'hr': {
                    return (
                        <View
                            key={`hr-${index}`}
                            style={markdownPdfStyles.hr}
                        />
                    );
                }

                case 'list': {
                    const listItems = (item.items ?? []).filter((listItem) => listItem.inlineTokens.some((tk) => tk.text.trim() !== ''));

                    if (listItems.length === 0) {
                        return null;
                    }

                    return (
                        <View
                            key={`list-${index}`}
                            style={markdownPdfStyles.list}
                        >
                            {listItems.map((listItem, li) => (
                                <View
                                    key={`li-${index}-${li}`}
                                    style={markdownPdfStyles.listItem}
                                    wrap={false}
                                >
                                    <Text style={markdownPdfStyles.listBullet}>{item.ordered ? `${li + 1}.` : '•'}</Text>
                                    <Text style={markdownPdfStyles.listContent}>{renderInlineTokens(listItem.inlineTokens, `li-${index}-${li}`)}</Text>
                                </View>
                            ))}
                        </View>
                    );
                }

                case 'paragraph': {
                    if (!item.inlineTokens || item.inlineTokens.length === 0) {
                        return null;
                    }

                    return (
                        <Text
                            key={`para-${index}`}
                            style={markdownPdfStyles.paragraph}
                        >
                            {renderInlineTokens(item.inlineTokens, `para-${index}`)}
                        </Text>
                    );
                }

                default: {
                    return null;
                }
            }
        })
        .filter((element) => element !== null);

export const renderMarkdownBlocks = (markdown: string) => renderPDFContent(parseMarkdownTokens(markdown));
