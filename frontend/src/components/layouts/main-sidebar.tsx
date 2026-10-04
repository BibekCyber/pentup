import {
    ChevronsLeft,
    ChevronsRight,
    Clock,
    FileText,
    KeyRound,
    LayoutDashboard,
    LogOut,
    Moon,
    Plus,
    Settings,
    Settings2,
    Star,
    Sun,
    Target,
    UserIcon,
    Workflow,
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
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PasswordChangeForm } from '@/features/authentication/password-change-form';
import { usePermission } from '@/hooks/use-permission';
import { useTheme } from '@/hooks/use-theme';
import { useFavorites } from '@/providers/favorites-provider';
import { useSidebarFlows } from '@/providers/sidebar-flows-provider';
import { useTemplates } from '@/providers/templates-provider';
import { useUser } from '@/providers/user-provider';

// EMBER nav active accent: left brand bar on top of the token-driven
// brand-tint fill + primary icon that `data-[active=true]` already provides.
const navActiveAccent =
    "relative data-[active=true]:before:absolute data-[active=true]:before:left-0 data-[active=true]:before:top-1.5 data-[active=true]:before:bottom-1.5 data-[active=true]:before:w-[3px] data-[active=true]:before:rounded-r-full data-[active=true]:before:bg-primary data-[active=true]:before:content-['']";

// EMBER .rail-collapse: a clearly-visible circular toggle pinned to the rail's
// right edge (z-30 so page content can't clip it). Drives the same
// shadcn `toggleSidebar` behavior as the underlying SidebarRail.
const RailCollapse = () => {
    const { state, toggleSidebar } = useSidebar();

    return (
        <button
            aria-label="Toggle Sidebar"
            className="bg-card text-muted-foreground border-border-strong hover:border-primary hover:text-primary absolute top-[22px] -right-[11px] z-50 hidden size-[22px] place-items-center rounded-full border shadow-md transition-colors ease-linear sm:grid"
            onClick={toggleSidebar}
            title={state === 'collapsed' ? 'Expand sidebar' : 'Collapse sidebar'}
            type="button"
        >
            {state === 'collapsed' ? <ChevronsRight className="size-3.5" /> : <ChevronsLeft className="size-3.5" />}
        </button>
    );
};

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
    const userInitials = (user?.name ?? '')
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    const canSeeDashboard = usePermission('usage.view');
    const { isTemplateAdmin, pendingRequestsCount } = useTemplates();
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
            <RailCollapse />
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem className="flex items-center gap-2.5 px-1 py-1.5">
                        <div className="flex aspect-square size-8 items-center justify-center">
                            <Logo className="hover:animate-logo-spin size-6 drop-shadow-[0_0_10px_rgba(245,114,20,0.45)]" />
                        </div>
                        <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                            <span className="truncate text-[15px] font-bold tracking-[0.02em]">
                                <span className="text-primary">AI</span> Pentest
                            </span>
                            <span className="text-muted-foreground truncate font-mono text-[10px] tracking-[0.08em]">
                                by <span className="text-foreground/90 font-semibold">CyberFortify</span>
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
                                    tooltip="New Scan"
                                >
                                    <Link to="/scans/new">
                                        <Plus />
                                        <span className="group-data-[collapsible=icon]:hidden">New Scan</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            {canSeeDashboard && (
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        asChild
                                        className={`${navActiveAccent} h-9`}
                                        isActive={!!isDashboardActive}
                                        tooltip="Dashboard"
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
                                    className={`${navActiveAccent} h-9`}
                                    isActive={!!isDomainsActive}
                                    tooltip="Scans"
                                >
                                    <Link to="/scans">
                                        <Target />
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
                                    className={`${navActiveAccent} h-9`}
                                    isActive={!!isFlowsActive}
                                    tooltip="Flows"
                                >
                                    <Link to="/flows">
                                        <Workflow />
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
                                    className={`${navActiveAccent} h-9`}
                                    isActive={!!isTemplatesActive}
                                    tooltip="Templates"
                                >
                                    <Link to="/templates">
                                        <FileText />
                                        Templates
                                    </Link>
                                </SidebarMenuButton>
                                {isTemplateAdmin && pendingRequestsCount > 0 ? (
                                    // Requests waiting for review; makes way for the + action on hover.
                                    <SidebarMenuBadge className="bg-primary/15 text-primary top-2 rounded-full transition-opacity group-hover/menu-item:opacity-0">
                                        {pendingRequestsCount > 99 ? '99+' : pendingRequestsCount}
                                    </SidebarMenuBadge>
                                ) : null}
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
                            className={`${navActiveAccent} h-9`}
                            isActive={!!isSettingsActive}
                            tooltip="Settings"
                        >
                            <Link to="/settings">
                                <Settings />
                                Settings
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>

                {/* EMBER .rail-foot — user bar: profile menu + theme toggle */}
                <div className="border-sidebar-border mt-1 flex items-center gap-1.5 border-t pt-3 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-1.5">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                className="hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1 text-left outline-hidden transition-colors group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:p-0"
                                type="button"
                            >
                                <span className="bg-brand-tint border-border text-primary flex size-8 shrink-0 items-center justify-center rounded-lg border text-[11px] font-bold">
                                    {userInitials || <UserIcon className="size-4" />}
                                </span>
                                <span className="grid flex-1 leading-tight group-data-[collapsible=icon]:hidden">
                                    <span className="truncate text-[12.5px] font-semibold">{user?.name}</span>
                                    <span className="text-muted-foreground truncate font-mono text-[10px]">
                                        {user?.mail}
                                    </span>
                                </span>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="start"
                            className="border-border-strong w-56 rounded-lg p-1.5"
                            side="top"
                            sideOffset={8}
                        >
                            <DropdownMenuLabel className="p-0 font-normal">
                                <div className="border-border mb-1 flex items-center gap-2 border-b px-1 pt-1 pb-2 text-left text-sm">
                                    <span className="bg-brand-tint border-border text-primary flex size-8 shrink-0 items-center justify-center rounded-lg border text-[11px] font-bold">
                                        {userInitials || <UserIcon className="size-4" />}
                                    </span>
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
                    <button
                        aria-label="Toggle theme"
                        className="text-muted-foreground hover:bg-sidebar-accent hover:text-foreground hover:border-border flex size-8 shrink-0 place-items-center justify-center rounded-lg border border-transparent transition-colors"
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        title="Toggle theme"
                        type="button"
                    >
                        {theme === 'dark' ? <Moon className="size-4" /> : <Sun className="size-4" />}
                    </button>
                </div>
            </SidebarFooter>

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
