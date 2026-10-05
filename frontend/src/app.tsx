import { ApolloProvider } from '@apollo/client';
import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import AppLayout from '@/components/layouts/app-layout';
import DomainsLayout from '@/components/layouts/domains-layout';
import FlowsLayout from '@/components/layouts/flows-layout';
import MainLayout from '@/components/layouts/main-layout';
import SettingsLayout from '@/components/layouts/settings-layout';
import ProtectedByPermission from '@/components/routes/protected-by-permission';
import ProtectedRoute from '@/components/routes/protected-route';
import PublicRoute from '@/components/routes/public-route';
import PageLoader from '@/components/shared/page-loader';
import { Toaster } from '@/components/ui/sonner';
import { usePermission } from '@/hooks/use-permission';
import client from '@/lib/apollo';
import { DomainProvider } from '@/providers/domain-provider';
import { FavoritesProvider } from '@/providers/favorites-provider';
import { FlowProvider } from '@/providers/flow-provider';
import { PROVIDERS_ADMIN_PERMISSION, ProvidersProvider } from '@/providers/providers-provider';
import { TemplatesProvider } from '@/providers/templates-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { UserProvider } from '@/providers/user-provider';

import { SystemSettingsProvider } from './providers/system-settings-provider';

const Dashboard = lazy(() => import('@/pages/dashboard/dashboard'));
const Domain = lazy(() => import('@/pages/domains/domain'));
const Domains = lazy(() => import('@/pages/domains/domains'));
const NewEngagement = lazy(() => import('@/pages/domains/new-engagement'));
// Note: new-domain (the original single-step scan form) and execution-preview
// (the split-terminal demo) remain in the codebase but are no longer routed —
// the engagement wizard is now the scan-creation flow at /scans/new.
const Flow = lazy(() => import('@/pages/flows/flow'));
const FlowReport = lazy(() => import('@/pages/flows/flow-report'));
const Flows = lazy(() => import('@/pages/flows/flows'));
const NewFlow = lazy(() => import('@/pages/flows/new-flow'));
const Chat = lazy(() => import('@/pages/chat/chat'));
const ChatLayout = lazy(() => import('@/pages/chat/chat').then((module) => ({ default: module.ChatLayout })));
const Login = lazy(() => import('@/pages/login'));
const Template = lazy(() => import('@/pages/templates/template'));
const TemplateRequest = lazy(() => import('@/pages/templates/template-request'));
const TemplateRequests = lazy(() => import('@/pages/templates/template-requests'));
const Templates = lazy(() => import('@/pages/templates/templates'));
const OAuthResult = lazy(() => import('@/pages/oauth-result'));
const SettingsAPITokens = lazy(() => import('@/pages/settings/settings-api-tokens'));
const SettingsPrompt = lazy(() => import('@/pages/settings/settings-prompt'));
const SettingsPrompts = lazy(() => import('@/pages/settings/settings-prompts'));
const SettingsProvider = lazy(() => import('@/pages/settings/settings-provider'));
const SettingsProviders = lazy(() => import('@/pages/settings/settings-providers'));
const SettingsUsers = lazy(() => import('@/pages/settings/settings-users'));

const DefaultLanding = () => {
    const canSeeDashboard = usePermission('usage.view');

    return (
        <Navigate
            replace
            to={canSeeDashboard ? '/dashboard' : '/chat'}
        />
    );
};

const App = () => {
    const renderProtectedRoute = () => (
        <ProtectedRoute>
            <SystemSettingsProvider>
                <ProvidersProvider>
                    <AppLayout />
                </ProvidersProvider>
            </SystemSettingsProvider>
        </ProtectedRoute>
    );

    const renderPublicRoute = () => (
        <PublicRoute>
            <Login />
        </PublicRoute>
    );

    return (
        <ApolloProvider client={client}>
            <ThemeProvider defaultTheme="dark">
                <Toaster />
                <BrowserRouter>
                    <UserProvider>
                        <FavoritesProvider>
                            <TemplatesProvider>
                                <Suspense fallback={<PageLoader />}>
                                    <Routes>
                                        {/* private routes */}
                                        <Route element={renderProtectedRoute()}>
                                            {/* Main layout for chat pages */}
                                            <Route element={<MainLayout />}>
                                                <Route
                                                    element={
                                                        <ProtectedByPermission permission="usage.view">
                                                            <Dashboard />
                                                        </ProtectedByPermission>
                                                    }
                                                    path="dashboard"
                                                />

                                                {/* Pentest chat */}
                                                <Route
                                                    element={
                                                        <ProtectedByPermission
                                                            fallback="/scans"
                                                            permission="chat.use"
                                                        >
                                                            <ChatLayout />
                                                        </ProtectedByPermission>
                                                    }
                                                    path="chat"
                                                >
                                                    <Route
                                                        element={<Chat />}
                                                        index
                                                    />
                                                    <Route
                                                        element={<Chat />}
                                                        path=":sessionId"
                                                    />
                                                </Route>

                                                {/* Flows section with FlowsProvider */}
                                                <Route element={<FlowsLayout />}>
                                                    <Route
                                                        element={<Flows />}
                                                        path="flows"
                                                    />
                                                    <Route
                                                        element={<NewFlow />}
                                                        path="flows/new"
                                                    />
                                                    <Route
                                                        element={
                                                            <FlowProvider>
                                                                <Flow />
                                                            </FlowProvider>
                                                        }
                                                        path="flows/:flowId"
                                                    />
                                                </Route>

                                                {/* Scans section with DomainsProvider */}
                                                <Route element={<DomainsLayout />}>
                                                    <Route
                                                        element={<Domains />}
                                                        path="scans"
                                                    />
                                                    <Route
                                                        element={<NewEngagement />}
                                                        path="scans/new"
                                                    />
                                                    <Route
                                                        element={
                                                            <DomainProvider>
                                                                <Domain />
                                                            </DomainProvider>
                                                        }
                                                        path="scans/:domainId"
                                                    />
                                                </Route>

                                                {/* Legacy /domains → /scans redirects (keep old links working) */}
                                                <Route
                                                    element={
                                                        <Navigate
                                                            replace
                                                            to="/scans"
                                                        />
                                                    }
                                                    path="domains"
                                                />
                                                <Route
                                                    element={
                                                        <Navigate
                                                            replace
                                                            to="/scans/new"
                                                        />
                                                    }
                                                    path="domains/new"
                                                />
                                                <Route
                                                    element={
                                                        <Navigate
                                                            replace
                                                            to="/scans"
                                                        />
                                                    }
                                                    path="domains/:domainId"
                                                />

                                                <Route
                                                    element={<Templates />}
                                                    path="templates"
                                                />
                                                <Route
                                                    element={<Template />}
                                                    path="templates/:templateId"
                                                />
                                                <Route
                                                    element={
                                                        <ProtectedByPermission
                                                            fallback="/templates"
                                                            permission="templates.admin"
                                                        >
                                                            <TemplateRequests scope="review" />
                                                        </ProtectedByPermission>
                                                    }
                                                    path="templates/review"
                                                />
                                                <Route
                                                    element={<TemplateRequests scope="submissions" />}
                                                    path="templates/submissions"
                                                />
                                                <Route
                                                    element={<TemplateRequest />}
                                                    path="templates/requests/:requestId"
                                                />
                                                <Route
                                                    element={<Template />}
                                                    path="templates/requests/:requestId/edit"
                                                />

                                                {/* Settings with nested routes —
                                                    nested inside MainLayout so the
                                                    app rail/shell renders around it */}
                                                <Route
                                                    element={<SettingsLayout />}
                                                    path="settings"
                                                >
                                                    <Route
                                                        element={
                                                            <Navigate
                                                                replace
                                                                to="providers"
                                                            />
                                                        }
                                                        index
                                                    />
                                                    {/* Providers are shared and admin-only; the
                                                        index and catch-all redirects land here and
                                                        bounce everyone else to Prompts */}
                                                    <Route
                                                        element={
                                                            <ProtectedByPermission
                                                                fallback="/settings/prompts"
                                                                permission={PROVIDERS_ADMIN_PERMISSION}
                                                            >
                                                                <SettingsProviders />
                                                            </ProtectedByPermission>
                                                        }
                                                        path="providers"
                                                    />
                                                    <Route
                                                        element={
                                                            <ProtectedByPermission
                                                                fallback="/settings/prompts"
                                                                permission={PROVIDERS_ADMIN_PERMISSION}
                                                            >
                                                                <SettingsProvider />
                                                            </ProtectedByPermission>
                                                        }
                                                        path="providers/:providerId"
                                                    />
                                                    <Route
                                                        element={<SettingsPrompts />}
                                                        path="prompts"
                                                    />
                                                    <Route
                                                        element={<SettingsPrompt />}
                                                        path="prompts/:promptId"
                                                    />
                                                    <Route
                                                        element={<SettingsAPITokens />}
                                                        path="api-tokens"
                                                    />
                                                    <Route
                                                        element={
                                                            <ProtectedByPermission permission="users.view">
                                                                <SettingsUsers />
                                                            </ProtectedByPermission>
                                                        }
                                                        path="users"
                                                    />
                                                    {/* <Route
                                        path="mcp-servers"
                                        element={<SettingsMcpServers />}
                                        />
                                        <Route
                                            path="mcp-servers/new"
                                            element={<SettingsMcpServer />}
                                        />
                                        <Route
                                            path="mcp-servers/:mcpServerId"
                                            element={<SettingsMcpServer />}
                                        /> */}
                                                    {/* Catch-all route for unknown settings paths */}
                                                    <Route
                                                        element={
                                                            <Navigate
                                                                replace
                                                                to="/settings/providers"
                                                            />
                                                        }
                                                        path="*"
                                                    />
                                                </Route>
                                            </Route>
                                        </Route>

                                        {/* report routes */}
                                        <Route
                                            element={
                                                <ProtectedRoute>
                                                    <SystemSettingsProvider>
                                                        <FlowReport />
                                                    </SystemSettingsProvider>
                                                </ProtectedRoute>
                                            }
                                            path="flows/:flowId/report"
                                        />

                                        {/* public routes */}
                                        <Route
                                            element={renderPublicRoute()}
                                            path="login"
                                        />

                                        <Route
                                            element={<OAuthResult />}
                                            path="oauth/result"
                                        />

                                        {/* other routes */}
                                        <Route
                                            element={<DefaultLanding />}
                                            path="/"
                                        />
                                        <Route
                                            element={<DefaultLanding />}
                                            path="*"
                                        />
                                    </Routes>
                                </Suspense>
                            </TemplatesProvider>
                        </FavoritesProvider>
                    </UserProvider>
                </BrowserRouter>
            </ThemeProvider>
        </ApolloProvider>
    );
};

export default App;
