import { useMemo } from 'react';
import { NavLink, Outlet, useLocation, useParams } from 'react-router-dom';

import CommandBar from '@/components/layouts/command-bar';
import { usePermission } from '@/hooks/use-permission';
import { cn } from '@/lib/utils';

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
    { id: 'providers', path: '/settings/providers', title: 'Providers' },
    { id: 'prompts', path: '/settings/prompts', title: 'Prompts' },
    { id: 'api-tokens', label: 'API Tokens', path: '/settings/api-tokens', title: 'PentAGI API' },
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
            return 'PentAGI API';
        }

        const activeItem = menuItems.find((item) => path.startsWith(item.path));

        return activeItem?.title ?? 'Settings';
    }, [location.pathname, params]);
};

// Horizontal underline tab strip (in-app settings sub-nav) — stays inside the
// main app shell (rail + CommandBar) so Settings is a page in the app, not a
// separate section. Keeps the permission gating.
const SettingsTabs = () => {
    const canViewUsers = usePermission('users.view');
    const visibleMenuItems = menuItems.filter(
        (item) => !item.permission || (item.permission === 'users.view' && canViewUsers),
    );

    return (
        <div className="border-border text-muted-foreground mb-6 flex items-center gap-1 overflow-x-auto border-b">
            {visibleMenuItems.map((item) => (
                <NavLink
                    className={({ isActive }) =>
                        cn(
                            'relative -mb-px inline-flex items-center gap-1.5 border-b-2 border-transparent px-3 py-2 text-[13px] font-medium whitespace-nowrap transition-colors',
                            isActive ? 'border-primary text-foreground' : 'hover:text-foreground border-transparent',
                        )
                    }
                    key={item.id}
                    to={item.path}
                >
                    {item.label ?? item.title}
                </NavLink>
            ))}
        </div>
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
