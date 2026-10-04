import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useUser } from '@/providers/user-provider';

import { PasswordChangeForm } from './password-change-form';

const formSchema = z.object({
    mail: z
        .string()
        .min(1, {
            message: 'Login is required',
        })
        .refine(
            (value) => z.string().email().safeParse(value).success || ['admin', 'demo'].includes(value.toLowerCase()),
            {
                message: 'Invalid login',
            },
        ),
    password: z.string().min(1, {
        message: 'Password is required',
    }),
});

const errorMessage = 'Invalid login or password';

interface LoginFormProps {
    returnUrl?: string;
}

const LoginForm = ({ returnUrl = '/' }: LoginFormProps) => {
    const form = useForm<z.infer<typeof formSchema>>({
        defaultValues: {
            mail: '',
            password: '',
        },
        resolver: zodResolver(formSchema),
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<null | string>(null);
    const [passwordChangeRequired, setPasswordChangeRequired] = useState(false);
    const navigate = useNavigate();
    const { authInfo, isAuthenticated, login, setAuth } = useUser();

    const handleSubmit = async (values: z.infer<typeof formSchema>) => {
        setError(null);
        setIsSubmitting(true);

        try {
            const result = await login(values);

            if (!result.success) {
                setError(result.error || errorMessage);

                return;
            }

            if (result.passwordChangeRequired) {
                setPasswordChangeRequired(true);

                return;
            }

            navigate(returnUrl);
        } catch {
            setError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSkipPasswordChange = () => {
        navigate(returnUrl);
    };

    const handlePasswordChangeSuccess = () => {
        if (authInfo?.user) {
            // Update auth info with password_change_required set to false
            const updatedAuthData = {
                ...authInfo,
                user: {
                    ...authInfo.user,
                    password_change_required: false,
                },
            };

            setAuth(updatedAuthData);
            navigate(returnUrl);
        }
    };

    // If password change is required, show password change form.
    // Also check isAuthenticated() to ensure the user has a valid session.
    // If the session expired and user refreshed the page, the old authInfo may still
    // be in memory (race condition between clearAuth() and navigate()), but we must
    // NOT show the password change form because:
    //   1. The API endpoint /user/password requires authentication (returns 403 if not)
    //   2. The user must first re-login to establish a new valid session
    // Also check authInfo directly to handle page refresh scenarios where passwordChangeRequired
    // local state is lost but authInfo.user.password_change_required is still true.
    const shouldShowPasswordChange =
        (passwordChangeRequired || authInfo?.user?.password_change_required) &&
        authInfo?.user?.type === 'local' &&
        isAuthenticated();

    if (shouldShowPasswordChange) {
        return (
            <div className="w-full max-w-[360px]">
                <div className="mb-3.5 overline">Operator access</div>
                <h2 className="text-foreground text-[22px] font-bold tracking-tight">Update Password</h2>
                <p className="text-muted-foreground mt-1.5 text-[13px]">
                    You need to change your password before continuing.
                </p>
                <div className="mt-6">
                    <PasswordChangeForm
                        isModal={false}
                        onSkip={handleSkipPasswordChange}
                        onSuccess={handlePasswordChangeSuccess}
                        showSkip={true}
                    />
                </div>
            </div>
        );
    }

    return (
        <Form {...form}>
            <form
                className="w-full max-w-[360px]"
                onSubmit={form.handleSubmit(handleSubmit)}
            >
                <div className="mb-3.5 overline">Operator access</div>
                <h2 className="text-foreground text-[22px] font-bold tracking-tight">Sign in</h2>
                <p className="text-muted-foreground mt-1.5 text-[13px]">Enter your credentials to reach the console.</p>

                <div className="mt-6 flex flex-col gap-4">
                    <FormField
                        control={form.control}
                        name="mail"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="field-label">Email</FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        autoComplete="username"
                                        autoFocus
                                        placeholder="you@company.com"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center justify-between">
                                    <FormLabel className="field-label m-0">Password</FormLabel>
                                    <span className="text-primary cursor-pointer font-mono text-[11px]">Forgot?</span>
                                </div>
                                <FormControl>
                                    <Input
                                        {...field}
                                        autoComplete="current-password"
                                        placeholder="••••••••••••"
                                        type="password"
                                    />
                                </FormControl>
                                <div className="field-hint">12+ chars · upper/lower/number/symbol</div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Button
                        className="mt-2 w-full"
                        disabled={isSubmitting || (!form.formState.isValid && form.formState.isSubmitted)}
                        type="submit"
                    >
                        {isSubmitting && <Loader2 className="animate-spin" />}
                        <span>Sign in</span>
                    </Button>

                    {error && <FormMessage>{error}</FormMessage>}
                </div>

                <p className="text-muted-foreground mt-6 text-center text-[11.5px] leading-relaxed">
                    Protected by secure session cookies. New operators are provisioned by an administrator.
                </p>
            </form>
        </Form>
    );
};

export default LoginForm;
