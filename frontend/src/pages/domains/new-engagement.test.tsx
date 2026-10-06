import { InMemoryCache } from '@apollo/client';
import { MockedProvider } from '@apollo/client/testing';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { SidebarProvider } from '@/components/ui/sidebar';
import { TargetType } from '@/graphql/types';

import NewEngagement from './new-engagement';

// The page reads templates from a provider whose own stack (user, favorites,
// apollo subscriptions) is far deeper than this test needs, so the one hook it
// calls is stubbed. Everything inside the page itself stays real.
vi.mock('@/providers/templates-provider', () => ({
    useTemplates: () => ({
        templates: [
            {
                id: '1',
                systemOwned: true,
                targetTypes: [TargetType.WebApp],
                text: 'Probe the web surface.',
                title: 'Web App Recon',
            },
        ],
    }),
}));

const renderWizard = () =>
    renderToStaticMarkup(
        <MockedProvider
            cache={new InMemoryCache()}
            mocks={[]}
        >
            <MemoryRouter>
                <SidebarProvider>
                    <NewEngagement />
                </SidebarProvider>
            </MemoryRouter>
        </MockedProvider>,
    );

describe('NewEngagement', () => {
    // A render smoke test, because the page is lazy-loaded behind a Suspense
    // boundary with no error boundary above it: anything thrown during render
    // blanks the whole app rather than showing a message. `npm run build` does
    // not catch it either — its typecheck runs against the root tsconfig, which
    // is looser than tsconfig.app.json, so a hook reading a `const` declared
    // further down the component compiled fine and only failed in the browser.
    it('renders the first step without throwing', () => {
        const html = renderWizard();

        expect(html).toContain('What are we assessing?');
        expect(html).toContain('Target');
    });

    it('starts with the Next button disabled, since no target is confirmed yet', () => {
        const html = renderWizard();

        // The target step cannot be left until checkTarget confirms the target.
        expect(html).toMatch(/<button[^>]*disabled[^>]*>\s*Next/);
    });
});
