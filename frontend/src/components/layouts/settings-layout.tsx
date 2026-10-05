import { useMemo } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';

import CommandBar from '@/components/layouts/command-bar';
import PageTabs from '@/components/layouts/page-tabs';
import { PROVIDERS_ADMIN_PERMISSION } from '@/providers/providers-provider';
import { useUser } from '@/providers/user-provider';

// Types
export interface MenuItem {
    id: string;
    // Presentational tab label (falls back to `title`, which drives the
    // CommandBar header logic below and must stay stable).
    label?: string;
    path: string;
    permission?: string;
    title: string;
}

// Settings menu items definition
const menuItems: readonly MenuItem[] = [
    { id: 'providers', path: '/settings/providers', permission: PROVIDERS_ADMIN_PERMISSION, title: 'Providers' },
    { id: 'prompts', path: '/settings/prompts', title: 'Prompts' },
    { id: 'api-tokens', label: 'API Tokens', path: '/settings/api-tokens', title: 'AI Pentest API' },
    { id: 'users', path: '/settings/users', permission: 'users.view', title: 'Users' },
] as const;

// Page title shown in the shared CommandBar (kept stable — same logic as before).
const useSettingsTitle = (): string => {
    const location = useLocation();
    const params = useParams();

    return useMemo(() => {
        const path = location.pathname;

        if (path === '/settings/providers/new') {
            return 'Create Provider';
        }

        if (path.startsWith('/settings/providers/') && params.providerId && params.providerId !== 'new') {
            return 'Edit Provider';
        }

        if (path === '/settings/prompts/new') {
            return 'Create Prompt';
        }

        if (path.startsWith('/settings/prompts/') && params.promptId && params.promptId !== 'new') {
            return 'Edit Prompt';
        }

        if (path === '/settings/api-tokens') {
            return 'AI Pentest API';
        }

        const activeItem = menuItems.find((item) => path.startsWith(item.path));

        return activeItem?.title ?? 'Settings';
    }, [location.pathname, params]);
};

// Horizontal underline tab strip (in-app settings sub-nav) — stays inside the
// main app shell (rail + CommandBar) so Settings is a page in the app, not a
// separate section. Keeps the permission gating.
const SettingsTabs = () => {
    const { authInfo } = useUser();
    const privileges = authInfo?.privileges ?? [];
    const visibleMenuItems = menuItems.filter((item) => !item.permission || privileges.includes(item.permission));

    return (
        <PageTabs
            className="mb-6"
            tabs={visibleMenuItems.map((item) => ({ id: item.id, label: item.label ?? item.title, path: item.path }))}
        />
    );
};

// Settings layout — nested inside MainLayout, so the app rail + shell render
// around it. Renders the shared CommandBar + a horizontal tab sub-nav + the
// active settings page.
const SettingsLayout = () => {
    const title = useSettingsTitle();

    return (
        <>
            <CommandBar title={title} />
            <div className="mx-auto w-full max-w-[1320px] p-6">
                <SettingsTabs />
                <Outlet />
            </div>
        </>
    );
};

export default SettingsLayout;
