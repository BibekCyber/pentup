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
        color: CF_PDF.accentText,
        fontFamily: 'Helvetica-Bold',
        fontSize: 9.5,
        minWidth: 14,
    },
    text: {
        color: CF_PDF.body,
        flex: 1,
        fontSize: 9.5,
        lineHeight: 1.5,
    },
});

interface BulletsProps {
    items: string[];
    link?: boolean;
}

// Strip any leading list marker the content already carries ("1. ", "2) ", "- ",
// "• ") so a bullet never renders on top of the item's own numbering.
const stripMarker = (text: string): string => text.replace(/^\s*(?:\d+[.)]|[-•*])\s+/, '').trim();

export const Bullets = ({ items, link }: BulletsProps) => (
    <View>
        {items.map((item, i) => (
            <View
                key={i}
                style={styles.item}
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
        ))}
    </View>
);
