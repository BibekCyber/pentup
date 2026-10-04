export interface DiffLine {
    text: string;
    type: 'added' | 'removed' | 'unchanged';
}

// Above this many line pairs the LCS table gets expensive; fall back to a plain
// "everything removed, everything added" diff (templates are far smaller).
const MAX_CELLS = 4_000_000;

/**
 * Line-level diff (longest common subsequence) between two texts, in reading
 * order: within a changed block, removed lines come before added lines.
 */
export const diffLines = (before: string, after: string): DiffLine[] => {
    const a = before.split('\n');
    const b = after.split('\n');

    if (before === after) {
        return a.map((text) => ({ text, type: 'unchanged' }));
    }

    if (a.length * b.length > MAX_CELLS) {
        return [
            ...a.map((text): DiffLine => ({ text, type: 'removed' })),
            ...b.map((text): DiffLine => ({ text, type: 'added' })),
        ];
    }

    // lcs[i][j] = LCS length of a[i..] and b[j..]
    const lcs: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));

    for (let i = a.length - 1; i >= 0; i--) {
        for (let j = b.length - 1; j >= 0; j--) {
            lcs[i]![j] = a[i] === b[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
        }
    }

    const result: DiffLine[] = [];
    let i = 0;
    let j = 0;

    while (i < a.length && j < b.length) {
        if (a[i] === b[j]) {
            result.push({ text: a[i]!, type: 'unchanged' });
            i++;
            j++;
        } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) {
            result.push({ text: a[i]!, type: 'removed' });
            i++;
        } else {
            result.push({ text: b[j]!, type: 'added' });
            j++;
        }
    }

    while (i < a.length) {
        result.push({ text: a[i++]!, type: 'removed' });
    }

    while (j < b.length) {
        result.push({ text: b[j++]!, type: 'added' });
    }

    return result;
};
