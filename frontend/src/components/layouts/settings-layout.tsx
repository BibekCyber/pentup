import { ArrowLeft, FileText, Key, Plug, Users } from 'lucide-react';
import { useMemo } from 'react';
import { NavLink, Outlet, useLocation, useParams } from 'react-router-dom';

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
    // {
    //     id: 'mcp-servers',
    //     title: 'MCP Servers',
    //     path: '/settings/mcp-servers',
    //     icon: <Server className="size-4" />,
    // },
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

// Settings sub-navigation — horizontal EMBER tab row (underline-active),
// replacing the previous sidebar menu. Keeps the permission gating logic.
const SettingsTabs = () => {
    const canViewUsers = usePermission('users.view');
    const visibleMenuItems = menuItems.filter(
        (item) => !item.permission || (item.permission === 'users.view' && canViewUsers),
    );

    return (
        <nav className="border-border bg-background/80 flex shrink-0 items-center gap-0.5 overflow-x-auto border-b px-[22px] backdrop-blur-md">
            {visibleMenuItems.map((item) => (
                <NavLink
                    className={({ isActive }) =>
                        cn(
                            'relative flex items-center gap-[7px] px-[13px] py-[9px] text-[13px] font-semibold whitespace-nowrap transition-colors',
                            isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                        )
                    }
                    key={item.id}
                    to={item.path}
                >
                    {({ isActive }) => (
                        <>
                            {item.icon}
                            {item.label ?? item.title}
                            {isActive ? (
                                <span className="bg-primary absolute inset-x-2 -bottom-px h-0.5 rounded-full shadow-[0_0_8px_var(--primary)]" />
                            ) : null}
                        </>
                    )}
                </NavLink>
            ))}
            <NavLink
                className="text-muted-foreground hover:text-foreground ml-auto flex shrink-0 items-center gap-1.5 py-[9px] pl-4 text-[12px] font-medium whitespace-nowrap transition-colors"
                to="/flows"
            >
                <ArrowLeft className="size-3.5" />
                Back to App
            </NavLink>
        </nav>
    );
};

// Settings layout component
const SettingsLayout = () => {
    return (
        <SidebarProvider>
            <div className="flex h-screen w-full flex-col overflow-hidden">
                <SettingsHeader />
                <SettingsTabs />
                {/* Content area for nested routes */}
                <main className="min-h-0 flex-1 overflow-auto">
                    <div className="mx-auto w-full max-w-[1320px] p-6">
                        <Outlet />
                    </div>
                </main>
            </div>
        </SidebarProvider>
    );
};

export default SettingsLayout;
