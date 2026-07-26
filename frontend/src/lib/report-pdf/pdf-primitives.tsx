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
    ordered?: boolean;
}

export const Bullets = ({ items, link, ordered }: BulletsProps) => (
    <View>
        {items.map((item, i) => (
            <View
                key={i}
                style={styles.item}
            >
                <Text style={styles.marker}>{ordered ? `${i + 1}.` : '•'}</Text>
                {link ? (
                    <Link
                        src={item}
                        style={styles.link}
                    >
                        {item}
                    </Link>
                ) : (
                    <Text style={styles.text}>{item}</Text>
                )}
            </View>
        ))}
    </View>
);
