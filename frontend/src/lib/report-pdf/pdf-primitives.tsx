import type { ReactNode } from 'react';

import { Link, StyleSheet, Text, View } from '@react-pdf/renderer';

import { CF_PDF } from './cf-brand';

// Shared bullet/numbered list used across the report so every list reads the same.
const styles = StyleSheet.create({
    item: {
        flexDirection: 'row',
        marginBottom: 3.5,
    },
    link: {
        color: CF_PDF.accentText,
        flex: 1,
        fontSize: 9,
        lineHeight: 1.5,
        textDecoration: 'none',
    },
    marker: {
        color: CF_PDF.ink,
        fontSize: 9.5,
        minWidth: 14,
    },
    text: {
        color: CF_PDF.body,
        flex: 1,
        fontSize: 9.5,
        lineHeight: 1.5,
        textAlign: 'justify',
    },
});

// Items longer than this could approach a full page; letting those split is safer
// than an unbreakable block taller than the page (which react-pdf can't place).
const KEEP_TOGETHER_MAX_CHARS = 1800;

interface BulletsProps {
    // Optional section label kept on the same page as the first item, so a label
    // is never stranded at the foot of a page with its list on the next.
    heading?: ReactNode;
    items: string[];
    link?: boolean;
}

// Strip any leading list marker the content already carries ("1. ", "2) ", "- ",
// "• ") so a bullet never renders on top of the item's own numbering.
const stripMarker = (text: string): string => text.replace(/^\s*(?:\d+[.)]|[-•*])\s+/, '').trim();

export const Bullets = ({ heading, items, link }: BulletsProps) => (
    <View>
        {items.map((item, i) => {
            const row = (
                <View
                    key={i}
                    // An unbreakable row keeps the bullet beside its text: when a
                    // multi-line item doesn't fit, the whole item moves to the next page
                    // instead of leaving a lone bullet behind.
                    style={styles.item}
                    wrap={item.length > KEEP_TOGETHER_MAX_CHARS}
                >
                    <Text style={styles.marker}>•</Text>
                    {link ? (
                        <Link
                            src={item}
                            style={styles.link}
                        >
                            {item}
                        </Link>
                    ) : (
                        <Text style={styles.text}>{stripMarker(item)}</Text>
                    )}
                </View>
            );

            return i === 0 && heading ? (
                <View
                    key={i}
                    wrap={item.length > KEEP_TOGETHER_MAX_CHARS}
                >
                    {heading}
                    {row}
                </View>
            ) : (
                row
            );
        })}
    </View>
);
