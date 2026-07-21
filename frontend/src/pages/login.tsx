import { Loader2 } from 'lucide-react';
import { useLocation, useSearchParams } from 'react-router-dom';

import Logo from '@/components/icons/logo';
import LoginForm from '@/features/authentication/login-form';
import { getSafeReturnUrl } from '@/lib/utils/auth';
import { useUser } from '@/providers/user-provider';

const Login = () => {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const { authInfo, isLoading } = useUser();
    const authProviders = authInfo?.providers || [];

    // Extract the return URL from either location state or query parameters
    const returnUrl = getSafeReturnUrl((location.state?.from as string) || searchParams.get('returnUrl'), '/flows/new');

    return (
        <div className="bg-background flex h-dvh w-full items-center justify-center">
            <div className="h-dvh w-full lg:grid lg:grid-cols-2">
                <div className="bg-background flex items-center justify-center px-4 py-12">
                    {!isLoading ? (
                        <LoginForm
                            providers={authProviders}
                            returnUrl={returnUrl}
                        />
                    ) : (
                        <Loader2 className="text-primary size-16 animate-spin" />
                    )}
                </div>
                <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between">
                    <div className="from-primary/15 via-background to-background absolute inset-0 bg-linear-to-br" />
                    <div className="bg-primary/8 absolute -top-32 -right-24 size-96 rounded-full blur-3xl" />

                    <div className="relative z-10 flex items-center gap-3 p-10">
                        <Logo className="text-primary size-8" />
                        <div className="flex flex-col leading-none">
                            <span className="text-foreground text-lg font-bold tracking-tight">PentAGI</span>
                            <span className="text-muted-foreground mt-1 font-mono text-[10px] tracking-[0.14em] uppercase">
                                Autonomous pentesting
                            </span>
                        </div>
                    </div>

                    <Logo className="animate-logo-spin text-primary relative z-10 m-auto size-32 delay-10000" />

                    <div className="border-border relative z-10 max-w-md border-t p-10">
                        <div className="text-primary mb-3 font-mono text-[11px] font-semibold tracking-[0.14em] uppercase">
                            Operator Console
                        </div>
                        <p className="text-foreground text-xl font-semibold tracking-tight">
                            Ship findings, not false positives.
                        </p>
                        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                            Autonomous agents run recon, exploitation and reporting — you review confirmed,
                            evidence-backed results, not a triage backlog.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
