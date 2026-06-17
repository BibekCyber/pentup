import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Copy, Loader2, RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { getApiErrorMessage } from '@/lib/api/errors';
import { updateUser, type UserRole } from '@/lib/api/users';
import { cn } from '@/lib/utils';
import { generateStrongPassword, passwordRequirements, passwordSchema } from '@/schemas/password-schema';

const schema = z.object({
    password: passwordSchema,
});

interface UserResetPasswordDialogProps {
    onOpenChange: (open: boolean) => void;
    open: boolean;
    user: null | UserRole;
}

type Values = z.infer<typeof schema>;

const UserResetPasswordDialog = ({ onOpenChange, open, user }: UserResetPasswordDialogProps) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<null | string>(null);
    const [resetDone, setResetDone] = useState(false);

    const form = useForm<Values>({
        defaultValues: { password: '' },
        mode: 'onChange',
        resolver: zodResolver(schema),
    });

    const { control, handleSubmit, reset, setValue, watch } = form;
    const passwordValue = watch('password') ?? '';

    useEffect(() => {
        if (open) {
            setError(null);
            setResetDone(false);
            reset({ password: '' });
        }
    }, [open, reset]);

    const onSubmit = async (values: Values) => {
        if (!user) {
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await updateUser({
                hash: user.hash,
                mail: user.mail,
                name: user.name,
                password: values.password,
                role_id: user.role_id,
                status: user.status,
                type: user.type,
            });
            setResetDone(true);
            toast.success('Password reset');
        } catch (err) {
            setError(getApiErrorMessage(err, 'Failed to reset password'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(passwordValue);
            toast.success('Password copied to clipboard');
        } catch {
            toast.error('Failed to copy password');
        }
    };

    return (
        <Dialog
            onOpenChange={onOpenChange}
            open={open}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Reset password</DialogTitle>
                    <DialogDescription>
                        {resetDone
                            ? 'Copy this password now and share it with the user out of band. It will not be shown again.'
                            : `Set a new password for ${user?.mail ?? 'this user'}.`}
                    </DialogDescription>
                </DialogHeader>

                {resetDone ? (
                    <div className="flex flex-col gap-4">
                        <div className="bg-muted flex items-center justify-between gap-2 rounded p-3">
                            <code className="text-sm break-all">{passwordValue}</code>
                        </div>
                        <Button
                            onClick={handleCopy}
                            variant="secondary"
                        >
                            <Copy className="size-4" />
                            Copy password
                        </Button>
                        <DialogFooter>
                            <Button
                                onClick={() => onOpenChange(false)}
                                type="button"
                            >
                                Done
                            </Button>
                        </DialogFooter>
                    </div>
                ) : (
                    <Form {...form}>
                        <form
                            className="flex flex-col gap-4"
                            onSubmit={handleSubmit(onSubmit)}
                        >
                            <FormField
                                control={control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>New password</FormLabel>
                                        <div className="flex gap-2">
                                            <FormControl>
                                                <Input
                                                    autoComplete="new-password"
                                                    placeholder="Enter or generate a password"
                                                    type="text"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <Button
                                                onClick={() =>
                                                    setValue('password', generateStrongPassword(), {
                                                        shouldDirty: true,
                                                        shouldValidate: true,
                                                    })
                                                }
                                                type="button"
                                                variant="outline"
                                            >
                                                <RefreshCw className="size-4" />
                                                Generate
                                            </Button>
                                        </div>
                                        <ul className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-2">
                                            {passwordRequirements.map((req) => {
                                                const met = req.met(passwordValue);

                                                return (
                                                    <li
                                                        className={cn(
                                                            'flex items-center gap-1.5 text-xs',
                                                            met
                                                                ? 'text-green-600 dark:text-green-400'
                                                                : 'text-muted-foreground',
                                                        )}
                                                        key={req.label}
                                                    >
                                                        {met ? <Check className="size-3" /> : <X className="size-3" />}
                                                        {req.label}
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {error && <div className="text-destructive text-sm">{error}</div>}

                            <DialogFooter>
                                <Button
                                    onClick={() => onOpenChange(false)}
                                    type="button"
                                    variant="outline"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    disabled={isSubmitting}
                                    type="submit"
                                >
                                    {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                                    Reset password
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default UserResetPasswordDialog;
