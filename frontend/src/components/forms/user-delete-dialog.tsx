import { Loader2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getApiErrorMessage } from '@/lib/api/errors';
import { deleteUser, type UserRole } from '@/lib/api/users';

interface UserDeleteDialogProps {
    onDeleted: () => void;
    onOpenChange: (open: boolean) => void;
    open: boolean;
    user: null | UserRole;
}

const UserDeleteDialog = ({ onDeleted, onOpenChange, open, user }: UserDeleteDialogProps) => {
    const [confirmText, setConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<null | string>(null);

    useEffect(() => {
        if (open) {
            setConfirmText('');
            setError(null);
        }
    }, [open]);

    const canDelete = Boolean(user) && confirmText.trim() === user?.mail;

    const handleDelete = async () => {
        if (!user || !canDelete) {
            return;
        }

        setIsDeleting(true);
        setError(null);

        try {
            await deleteUser(user.hash);
            toast.success('User deleted');
            onDeleted();
            onOpenChange(false);
        } catch (err) {
            setError(getApiErrorMessage(err, 'Failed to delete user'));
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Dialog
            onOpenChange={onOpenChange}
            open={open}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete user</DialogTitle>
                    <DialogDescription>
                        This is permanent and cannot be undone. Type the user&apos;s email to confirm.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-2">
                    <Label htmlFor="confirm-email">
                        Type <span className="font-mono font-semibold">{user?.mail}</span> to confirm
                    </Label>
                    <Input
                        autoComplete="off"
                        id="confirm-email"
                        onChange={(event) => setConfirmText(event.target.value)}
                        placeholder={user?.mail}
                        value={confirmText}
                    />
                    {error && <div className="text-destructive text-sm">{error}</div>}
                </div>

                <DialogFooter>
                    <Button
                        onClick={() => onOpenChange(false)}
                        type="button"
                        variant="outline"
                    >
                        Cancel
                    </Button>
                    <Button
                        disabled={!canDelete || isDeleting}
                        onClick={handleDelete}
                        variant="destructive"
                    >
                        {isDeleting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Trash2 className="mr-2 size-4" />}
                        Delete user
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default UserDeleteDialog;
