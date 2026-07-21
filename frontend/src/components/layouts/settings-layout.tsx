import { ArrowLeft, FileText, Key, Plug, Settings as SettingsIcon, Users } from 'lucide-react';
import { useMemo } from 'react';
import { NavLink, Outlet, useLocation, useParams } from 'react-router-dom';

import CommandBar from '@/components/layouts/command-bar';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
} from '@/components/ui/sidebar';
import { usePermission } from '@/hooks/use-permission';

// EMBER nav active accent (matches main rail): left brand bar on top of the
// token-driven brand-tint fill + primary icon from `data-[active=true]`.
const navActiveAccent =
    "relative data-[active=true]:before:absolute data-[active=true]:before:left-0 data-[active=true]:before:top-1.5 data-[active=true]:before:bottom-1.5 data-[active=true]:before:w-[3px] data-[active=true]:before:rounded-r-full data-[active=true]:before:bg-primary data-[active=true]:before:content-['']";

// Types
export interface MenuItem {
    icon?: React.ReactNode;
    id: string;
    isActive?: boolean;
    path: string;
    permission?: string;
    title: string;
}

interface SettingsSidebarMenuItemProps {
    item: MenuItem;
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

// Individual menu item component to properly use hooks
const SettingsSidebarMenuItem = ({ item }: SettingsSidebarMenuItemProps) => {
    const location = useLocation();
    // Check if current path starts with item path (for nested routes)
    const isActive = location.pathname.startsWith(item.path);

    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                asChild
                className={navActiveAccent}
                isActive={isActive}
            >
                <NavLink to={item.path}>
                    {item.icon}
                    {item.title}
                </NavLink>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
};

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

// Settings sidebar component
const SettingsSidebar = () => {
    const canViewUsers = usePermission('users.view');
    const visibleMenuItems = menuItems.filter(
        (item) => !item.permission || (item.permission === 'users.view' && canViewUsers),
    );

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem className="flex items-center gap-2.5 px-1 py-1.5">
                        <div className="flex aspect-square size-8 items-center justify-center">
                            <SettingsIcon className="text-primary size-6" />
                        </div>
                        <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                            <span className="truncate text-[15px] font-bold tracking-[0.02em]">Settings</span>
                            <span className="text-muted-foreground truncate font-mono text-[9px] tracking-[0.18em] uppercase">
                                configuration
                            </span>
                        </div>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {visibleMenuItems.map((item) => (
                                <SettingsSidebarMenuItem
                                    item={item}
                                    key={item.id}
                                />
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenuButton asChild>
                    <NavLink to="/flows">
                        <ArrowLeft className="size-4" />
                        Back to App
                    </NavLink>
                </SidebarMenuButton>
            </SidebarFooter>
        </Sidebar>
    );
};

// Settings layout component
const SettingsLayout = () => {
    return (
        <SidebarProvider>
            <div className="flex h-screen w-full overflow-hidden">
                <SettingsSidebar />
                <SidebarInset className="flex flex-1 flex-col">
                    <SettingsHeader />
                    {/* Content area for nested routes */}
                    <main className="min-h-0 flex-1 overflow-auto p-6">
                        <div className="mx-auto w-full max-w-[1320px]">
                            <Outlet />
                        </div>
                    </main>
                </SidebarInset>
            </div>
        </SidebarProvider>
    );
};

export default SettingsLayout;
