import { ChevronLeft, FileText, Key, Plug, Users } from 'lucide-react';
import { useMemo } from 'react';
import { Link, NavLink, Outlet, useLocation, useParams } from 'react-router-dom';

import Logo from '@/components/icons/logo';
import CommandBar from '@/components/layouts/command-bar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { usePermission } from '@/hooks/use-permission';
import { cn } from '@/lib/utils';

// Types
export interface MenuItem {
    icon?: React.ReactNode;
    id: string;
    isActive?: boolean;
    // Presentational tab label (falls back to `title`, which drives the
    // CommandBar header logic below and must stay stable).
    label?: string;
    path: string;
    permission?: string;
    title: string;
}

// Settings menu items definition
const menuItems: readonly MenuItem[] = [
    {
        icon: <Plug className="size-4" />,
        id: 'providers',
        path: '/settings/providers',
        title: 'Providers',
    },
    {
        icon: <FileText className="size-4" />,
        id: 'prompts',
        path: '/settings/prompts',
        title: 'Prompts',
    },
    {
        icon: <Key className="size-4" />,
        id: 'api-tokens',
        label: 'API Tokens',
        path: '/settings/api-tokens',
        title: 'PentAGI API',
    },
    {
        icon: <Users className="size-4" />,
        id: 'users',
        path: '/settings/users',
        permission: 'users.view',
        title: 'Users',
    },
] as const;

// Settings header component
const SettingsHeader = () => {
    const location = useLocation();
    const params = useParams();

    // Memoize title calculation for better performance
    const title = useMemo(() => {
        const path = location.pathname;

        // Check for specific nested routes
        if (path === '/settings/providers/new') {
            return 'Create Provider';
        }

        if (path.startsWith('/settings/providers/') && params.providerId && params.providerId !== 'new') {
            return 'Edit Provider';
        }

        if (path === '/settings/mcp-servers/new') {
            return 'Create MCP Server';
        }

        if (path.startsWith('/settings/mcp-servers/')) {
            return 'Edit MCP Server';
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

        // Find matching main section
        const activeItem = menuItems.find((item) => path.startsWith(item.path));

        return activeItem?.title ?? 'Settings';
    }, [location.pathname, params]);

    return <CommandBar title={title} />;
};

// Settings sub-navigation — vertical EMBER sidebar column. Reads as a distinct
// "you navigated into Settings" section. Short list, no internal scroll. Keeps
// the permission gating logic.
const SettingsNav = () => {
    const canViewUsers = usePermission('users.view');
    const visibleMenuItems = menuItems.filter(
        (item) => !item.permission || (item.permission === 'users.view' && canViewUsers),
    );

    return (
        <aside className="border-border bg-sidebar flex w-[240px] shrink-0 flex-col border-r">
            {/* Brand header — the way back to the console (Settings is a distinct
                full-page section, so the app rail is replaced; clicking the brand
                returns you to the app). */}
            <Link
                className="group border-border flex items-center gap-2.5 border-b px-4 py-[13px]"
                title="Back to console"
                to="/dashboard"
            >
                <ChevronLeft className="text-muted-foreground group-hover:text-primary size-4 shrink-0 transition-colors" />
                <Logo className="size-5 shrink-0 drop-shadow-[0_0_8px_rgba(245,114,20,0.4)]" />
                <span className="truncate text-[15px] font-bold tracking-[0.02em]">
                    Pent<span className="text-primary">AGI</span>
                </span>
            </Link>

            <div className="flex flex-col gap-1 px-3 py-4">
                <div className="px-[13px] pb-1.5 overline">Settings</div>
                <nav className="flex flex-col gap-1">
                    {visibleMenuItems.map((item) => (
                        <NavLink
                            className={({ isActive }) =>
                                cn(
                                    'relative flex items-center gap-[11px] rounded-md px-[13px] py-[9px] text-[13.5px] font-medium transition-colors',
                                    isActive
                                        ? 'bg-brand-tint text-foreground font-semibold'
                                        : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground',
                                )
                            }
                            key={item.id}
                            to={item.path}
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive ? (
                                        <span className="bg-primary absolute inset-y-[7px] -left-3 w-[3px] rounded-r shadow-[0_0_10px_var(--primary)]" />
                                    ) : null}
                                    <span className={cn('shrink-0', isActive && 'text-primary')}>{item.icon}</span>
                                    {item.label ?? item.title}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>
            </div>
        </aside>
    );
};

// Settings layout component
const SettingsLayout = () => {
    return (
        <SidebarProvider>
            <div className="flex h-screen w-full flex-col overflow-hidden">
                <SettingsHeader />
                {/* Sidebar sub-nav + content area for nested routes */}
                <div className="flex min-h-0 flex-1">
                    <SettingsNav />
                    <main className="min-h-0 flex-1 overflow-auto">
                        <div className="mx-auto w-full max-w-[1320px] p-6">
                            <Outlet />
                        </div>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
};

export default SettingsLayout;
