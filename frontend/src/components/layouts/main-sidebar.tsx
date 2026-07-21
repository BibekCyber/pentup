import { Avatar, AvatarFallback } from '@radix-ui/react-avatar';
import {
    ChevronsUpDown,
    Clock,
    FileText,
    GitFork,
    Globe,
    KeyRound,
    LayoutDashboard,
    LogOut,
    Moon,
    Plus,
    Settings,
    Settings2,
    Star,
    Sun,
    UserIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useMatch, useParams } from 'react-router-dom';

import type { Flow } from '@/providers/sidebar-flows-provider';
import type { Theme } from '@/providers/theme-provider';

import Logo from '@/components/icons/logo';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from '@/components/ui/sidebar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PasswordChangeForm } from '@/features/authentication/password-change-form';
import { usePermission } from '@/hooks/use-permission';
import { useTheme } from '@/hooks/use-theme';
import { useFavorites } from '@/providers/favorites-provider';
import { useSidebarFlows } from '@/providers/sidebar-flows-provider';
import { useUser } from '@/providers/user-provider';

// EMBER nav active accent: left brand bar on top of the token-driven
// brand-tint fill + primary icon that `data-[active=true]` already provides.
const navActiveAccent =
    "relative data-[active=true]:before:absolute data-[active=true]:before:left-0 data-[active=true]:before:top-1.5 data-[active=true]:before:bottom-1.5 data-[active=true]:before:w-[3px] data-[active=true]:before:rounded-r-full data-[active=true]:before:bg-primary data-[active=true]:before:content-['']";

interface FlowMenuItemProps {
    activeFlowId: null | number;
    flow: Flow;
    isFavorite: boolean;
    onToggleFavorite: (flowId: string) => void;
}

const FlowMenuItem = ({ activeFlowId, flow, isFavorite, onToggleFavorite }: FlowMenuItemProps) => {
    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                asChild
                className={navActiveAccent}
                isActive={activeFlowId === Number(flow.id)}
            >
                <Link to={`/flows/${flow.id}`}>
                    <span className="-mx-2 w-8 shrink-0 text-center font-mono text-xs group-data-[state=expanded]:hidden">
                        {flow.id}
                    </span>
                    <span className="text-muted-foreground bg-well border-border -my-0.5 -ml-0.5 h-5 min-w-5 shrink-0 rounded-md border px-px py-0.5 text-center font-mono text-[11px] group-data-[state=collapsed]:hidden">
                        {flow.id}
                    </span>
                    <span className="truncate">{flow.title}</span>
                </Link>
            </SidebarMenuButton>
            <SidebarMenuAction
                className="data-[state=open]:bg-accent rounded-sm"
                onClick={() => onToggleFavorite(flow.id)}
                showOnHover
            >
                <Star className={isFavorite ? 'fill-yellow-500 stroke-yellow-500' : ''} />
            </SidebarMenuAction>
        </SidebarMenuItem>
    );
};

export const MainSidebar = () => {
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const isDashboardActive = useMatch('/dashboard');
    const isDomainsActive = useMatch('/scans/*');
    const isFlowsActive = useMatch('/flows/*');
    const isTemplatesActive = useMatch('/templates/*');
    const isSettingsActive = useMatch('/settings/*');
    const { flowId: flowIdParam } = useParams<{ flowId: string }>();

    const { authInfo, logout } = useUser();
    const user = authInfo?.user;
    const canSeeDashboard = usePermission('usage.view');
    const { setTheme, theme } = useTheme();
    const { addFavoriteFlow, favoriteFlowIds, removeFavoriteFlow } = useFavorites();
    const { flows } = useSidebarFlows();

    const flowId = useMemo(() => (flowIdParam ? Number(flowIdParam) : null), [flowIdParam]);

    const favoriteFlows = useMemo(
        () =>
            flows
                .filter((flow) => favoriteFlowIds.includes(Number(flow.id)))
                .sort((a, b) => Number(b.id) - Number(a.id)),
        [flows, favoriteFlowIds],
    );

    const recentFlows = useMemo(
        () =>
            flows
                .filter((flow) => !favoriteFlowIds.includes(Number(flow.id)))
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 5),
        [flows, favoriteFlowIds],
    );

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem className="flex items-center gap-2.5 px-1 py-1.5">
                        <div className="flex aspect-square size-8 items-center justify-center">
                            <Logo className="hover:animate-logo-spin size-6 drop-shadow-[0_0_10px_rgba(245,114,20,0.45)]" />
                        </div>
                        <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                            <span className="truncate text-[15px] font-bold tracking-[0.02em]">
                                Pent<span className="text-primary">AGI</span>
                            </span>
                            <span className="text-muted-foreground truncate font-mono text-[9px] tracking-[0.18em] uppercase">
                                operator console
                            </span>
                        </div>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup className="bg-sidebar sticky top-0 z-10">
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem className="mb-1">
                                <SidebarMenuButton
                                    asChild
                                    className="text-primary-foreground shadow-glow-brand hover:text-primary-foreground h-9 justify-center bg-[linear-gradient(180deg,var(--primary-hover),var(--primary))] font-semibold hover:bg-transparent hover:brightness-105"
                                >
                                    <Link to="/flows/new">
                                        <Plus />
                                        New Flow
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            {canSeeDashboard && (
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        asChild
                                        className={navActiveAccent}
                                        isActive={!!isDashboardActive}
                                    >
                                        <Link to="/dashboard">
                                            <LayoutDashboard />
                                            Dashboard
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            )}
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    className={navActiveAccent}
                                    isActive={!!isDomainsActive}
                                >
                                    <Link to="/scans">
                                        <Globe />
                                        Scans
                                    </Link>
                                </SidebarMenuButton>
                                <SidebarMenuAction
                                    asChild
                                    className="data-[state=open]:bg-accent rounded-sm"
                                    showOnHover
                                >
                                    <Link to="/scans/new">
                                        <Plus />
                                    </Link>
                                </SidebarMenuAction>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    className={navActiveAccent}
                                    isActive={!!isFlowsActive}
                                >
                                    <Link to="/flows">
                                        <GitFork />
                                        Flows
                                    </Link>
                                </SidebarMenuButton>
                                <SidebarMenuAction
                                    asChild
                                    className="data-[state=open]:bg-accent rounded-sm"
                                    showOnHover
                                >
                                    <Link to="/flows/new">
                                        <Plus />
                                    </Link>
                                </SidebarMenuAction>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    className={navActiveAccent}
                                    isActive={!!isTemplatesActive}
                                >
                                    <Link to="/templates">
                                        <FileText />
                                        Templates
                                    </Link>
                                </SidebarMenuButton>
                                <SidebarMenuAction
                                    asChild
                                    className="data-[state=open]:bg-accent rounded-sm"
                                    showOnHover
                                >
                                    <Link to="/templates/new">
                                        <Plus />
                                    </Link>
                                </SidebarMenuAction>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {recentFlows.length > 0 && (
                    <SidebarGroup>
                        <SidebarGroupLabel className="text-muted-foreground flex items-center gap-2 font-mono text-[10.5px] tracking-[0.1em] uppercase">
                            <Clock />
                            Recent Flows
                        </SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {recentFlows.map((flow) => (
                                    <FlowMenuItem
                                        activeFlowId={flowId}
                                        flow={flow}
                                        isFavorite={false}
                                        key={flow.id}
                                        onToggleFavorite={addFavoriteFlow}
                                    />
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                )}

                {favoriteFlows.length > 0 && (
                    <SidebarGroup>
                        <SidebarGroupLabel className="text-muted-foreground flex items-center gap-2 font-mono text-[10.5px] tracking-[0.1em] uppercase">
                            <Star />
                            Favorite Flows
                        </SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {favoriteFlows.map((flow) => (
                                    <FlowMenuItem
                                        activeFlowId={flowId}
                                        flow={flow}
                                        isFavorite
                                        key={flow.id}
                                        onToggleFavorite={removeFavoriteFlow}
                                    />
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                )}
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            className={navActiveAccent}
                            isActive={!!isSettingsActive}
                        >
                            <Link to="/settings">
                                <Settings />
                                Settings
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    className="border-sidebar-border data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground mt-1 border-t pt-3"
                                    size="lg"
                                >
                                    <Avatar className="bg-brand-tint border-border text-primary size-8 items-center justify-center rounded-lg border">
                                        <AvatarFallback className="bg-brand-tint text-primary flex size-8 items-center justify-center rounded-lg text-xs font-bold">
                                            <UserIcon className="size-4" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-semibold">{user?.name}</span>
                                        <span className="text-muted-foreground truncate font-mono text-[10px]">
                                            {user?.mail}
                                        </span>
                                    </div>
                                    <ChevronsUpDown className="ml-auto size-4" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="end"
                                className="border-border-strong w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg p-1.5"
                                side="bottom"
                                sideOffset={4}
                            >
                                <DropdownMenuLabel className="p-0 font-normal">
                                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                        <Avatar className="bg-brand-tint border-border text-primary flex size-8 items-center justify-center rounded-lg border">
                                            <AvatarFallback className="bg-brand-tint text-primary flex items-center justify-center rounded-lg font-bold">
                                                <UserIcon className="size-4" />
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="grid flex-1 text-left text-sm leading-tight">
                                            <span className="truncate font-semibold">{user?.name}</span>
                                            <span className="text-muted-foreground truncate font-mono text-[10.5px]">
                                                {user?.mail}
                                            </span>
                                            <span className="text-muted-foreground truncate font-mono text-[10.5px] uppercase">
                                                {user?.type === 'local' ? 'local' : 'oauth'}
                                            </span>
                                        </div>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {/*
                                  Light/Dark toggle for the two RankLocal variants. The legacy
                                  system/light/dark (blue) themes stay in the provider but are
                                  intentionally not surfaced here.
                                */}
                                <DropdownMenuItem
                                    className="cursor-default hover:bg-transparent focus:bg-transparent"
                                    onSelect={(event) => event.preventDefault()}
                                >
                                    <Settings2 />
                                    Theme
                                    <Tabs
                                        className="-my-1.5 -mr-2 ml-auto"
                                        onValueChange={(value) => setTheme(value as Theme)}
                                        value={theme === 'dark' ? 'dark' : 'light'}
                                    >
                                        <TabsList className="h-7 p-0.5">
                                            <TabsTrigger
                                                className="h-6 px-2"
                                                value="light"
                                            >
                                                <Sun className="size-4" />
                                            </TabsTrigger>
                                            <TabsTrigger
                                                className="h-6 px-2"
                                                value="dark"
                                            >
                                                <Moon className="size-4" />
                                            </TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                </DropdownMenuItem>
                                {user?.type === 'local' && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => setIsPasswordModalOpen(true)}>
                                            <KeyRound className="mr-2 size-4" />
                                            Change Password
                                        </DropdownMenuItem>
                                    </>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => logout()}>
                                    <LogOut className="mr-2 size-4" />
                                    Log out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />

            <Dialog
                onOpenChange={setIsPasswordModalOpen}
                open={isPasswordModalOpen}
            >
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Change Password</DialogTitle>
                    </DialogHeader>
                    <PasswordChangeForm
                        onCancel={() => setIsPasswordModalOpen(false)}
                        onSuccess={() => setIsPasswordModalOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </Sidebar>
    );
};
