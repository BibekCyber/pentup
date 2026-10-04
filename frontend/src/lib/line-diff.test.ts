import { describe, expect, it } from 'vitest';

import { diffLines } from './line-diff';

const render = (before: string, after: string) =>
    diffLines(before, after).map(({ text, type }) => `${{ added: '+', removed: '-', unchanged: ' ' }[type]}${text}`);

describe('diffLines', () => {
    it('marks identical text as unchanged', () => {
        expect(render('a\nb', 'a\nb')).toEqual([' a', ' b']);
    });

    it('detects an edited line, removal first', () => {
        expect(render('a\nb\nc', 'a\nB\nc')).toEqual([' a', '-b', '+B', ' c']);
    });

    it('detects pure insertions and deletions', () => {
        expect(render('a\nc', 'a\nb\nc')).toEqual([' a', '+b', ' c']);
        expect(render('a\nb\nc', 'a\nc')).toEqual([' a', '-b', ' c']);
    });

    it('handles empty sides', () => {
        expect(render('', 'x')).toEqual(['-', '+x']);
        expect(render('x', '')).toEqual(['-x', '+']);
    });

    it('keeps every line of both texts', () => {
        const before = 'one\ntwo\nthree\nfour';
        const after = 'zero\none\nthree\nfour\nfive';
        const lines = diffLines(before, after);

        expect(lines.filter((l) => l.type !== 'added').map((l) => l.text)).toEqual(before.split('\n'));
        expect(lines.filter((l) => l.type !== 'removed').map((l) => l.text)).toEqual(after.split('\n'));
    });
});
