import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Loader2, X } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getApiErrorMessage } from '@/lib/api/errors';
import {
    createUser,
    type RolePrivileges,
    updateUser,
    type UserRole,
} from '@/lib/api/users';
import { cn } from '@/lib/utils';
import { passwordRequirements, passwordSchema } from '@/schemas/password-schema';

const createSchema = z.object({
    mail: z.string().trim().email({ message: 'Enter a valid email' }).max(50, { message: 'Email is too long' }),
    name: z.string().trim().min(1, { message: 'Name is required' }).max(70, { message: 'Name is too long' }),
    password: passwordSchema,
    roleId: z.string().min(1, { message: 'Select a role' }),
    status: z.enum(['active', 'blocked', 'created']),
});

const editSchema = createSchema.omit({ mail: true, password: true });

type CreateValues = z.infer<typeof createSchema>;
type EditValues = z.infer<typeof editSchema>;

interface UserFormDialogProps {
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
    open: boolean;
    roles: RolePrivileges[];
    user?: UserRole;
}

const PasswordChecklist = ({ password }: { password: string }) => (
    <ul className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-2">
        {passwordRequirements.map((req) => {
            const met = req.met(password);

            return (
                <li
                    className={cn('flex items-center gap-1.5 text-xs', met ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground')}
                    key={req.label}
                >
                    {met ? <Check className="size-3" /> : <X className="size-3" />}
                    {req.label}
                </li>
            );
        })}
    </ul>
);

const UserFormDialog = ({ onOpenChange, onSaved, open, roles, user }: UserFormDialogProps) => {
    const isEdit = Boolean(user);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<null | string>(null);

    const form = useForm<CreateValues>({
        defaultValues: {
            mail: '',
            name: '',
            password: '',
            roleId: '',
            status: 'active',
        },
        mode: 'onChange',
        resolver: zodResolver(isEdit ? editSchema : createSchema) as never,
    });

    const { control, handleSubmit, reset, watch } = form;
    const passwordValue = watch('password') ?? '';

    useEffect(() => {
        if (!open) {
            return;
        }

        setError(null);

        if (user) {
            reset({
                mail: user.mail,
                name: user.name,
                password: '',
                roleId: String(user.role_id),
                status: user.status,
            });
        } else {
            reset({ mail: '', name: '', password: '', roleId: '', status: 'active' });
        }
    }, [open, user, reset]);

    const onSubmit = async (values: CreateValues | EditValues) => {
        setIsSubmitting(true);
        setError(null);

        try {
            if (isEdit && user) {
                await updateUser({
                    hash: user.hash,
                    mail: user.mail,
                    name: values.name,
                    role_id: Number(values.roleId),
                    status: values.status,
                    type: user.type,
                });
                toast.success('User updated');
            } else {
                const createValues = values as CreateValues;
                await createUser({
                    mail: createValues.mail,
                    name: createValues.name,
                    password: createValues.password,
                    role_id: Number(createValues.roleId),
                    status: createValues.status,
                    type: 'local',
                });
                toast.success('User created');
            }

            onSaved();
            onOpenChange(false);
        } catch (err) {
            setError(getApiErrorMessage(err, isEdit ? 'Failed to update user' : 'Failed to create user'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog
            onOpenChange={onOpenChange}
            open={open}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Edit user' : 'Create user'}</DialogTitle>
                    <DialogDescription>
                        {isEdit
                            ? 'Update the name, role, and status for this user.'
                            : 'Add a new local user. Share the password with them out of band.'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form
                        className="flex flex-col gap-4"
                        onSubmit={handleSubmit(onSubmit)}
                    >
                        {!isEdit && (
                            <FormField
                                control={control}
                                name="mail"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input
                                                autoComplete="off"
                                                placeholder="user@example.com"
                                                type="email"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {isEdit && user && (
                            <div className="flex flex-col gap-1">
                                <span className="text-sm font-medium">Email</span>
                                <Input
                                    disabled
                                    readOnly
                                    value={user.mail}
                                />
                            </div>
                        )}

                        <FormField
                            control={control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Full name"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {!isEdit && (
                            <FormField
                                control={control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <FormControl>
                                            <Input
                                                autoComplete="new-password"
                                                placeholder="Set an initial password"
                                                type="password"
                                                {...field}
                                            />
                                        </FormControl>
                                        <PasswordChecklist password={passwordValue} />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField
                                control={control}
                                name="roleId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Role</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select role" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {roles.map((role) => (
                                                    <SelectItem
                                                        key={role.id}
                                                        value={String(role.id)}
                                                    >
                                                        {role.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Status</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select status" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="active">active</SelectItem>
                                                <SelectItem value="blocked">blocked</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

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
                                {isEdit ? 'Save changes' : 'Create user'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default UserFormDialog;
