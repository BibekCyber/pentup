import { type ReactNode, useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import ConfirmationDialog from '@/components/shared/confirmation-dialog';
import { useDeleteChatSessionMutation, useRenameChatSessionMutation } from '@/graphql/types';
import { Log } from '@/lib/log';

import type { ChatSession } from './chat-utils';

const errorMessage = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

/**
 * Rename and delete for chat sessions, shared by the history rail and the
 * conversation header. Render `confirmDialog` once where the hook is used.
 */
export const useChatSessionActions = (): {
    confirmDialog: ReactNode;
    renameSession: (session: ChatSession, title: string) => Promise<boolean>;
    requestDelete: (session: ChatSession) => void;
} => {
    const navigate = useNavigate();
    const { sessionId } = useParams<{ sessionId: string }>();
    const [pendingDelete, setPendingDelete] = useState<ChatSession | null>(null);

    const [renameMutation] = useRenameChatSessionMutation();
    const [deleteMutation] = useDeleteChatSessionMutation();

    const renameSession = useCallback(
        async (session: ChatSession, title: string) => {
            try {
                await renameMutation({ variables: { sessionId: session.id, title } });

                return true;
            } catch (error) {
                toast.error('Failed to rename chat', { description: errorMessage(error, 'Please try again') });
                Log.error('Error renaming chat session:', error);

                return false;
            }
        },
        [renameMutation],
    );

    const deleteSession = useCallback(
        async (session: ChatSession) => {
            try {
                await deleteMutation({
                    update: (cache) => {
                        cache.evict({ id: cache.identify({ __typename: 'ChatSession', id: session.id }) });
                        cache.gc();
                    },
                    variables: { sessionId: session.id },
                });

                if (String(session.id) === sessionId) {
                    navigate('/chat', { replace: true });
                }
            } catch (error) {
                toast.error('Failed to delete chat', { description: errorMessage(error, 'Please try again') });
                Log.error('Error deleting chat session:', error);
            }
        },
        [deleteMutation, navigate, sessionId],
    );

    const confirmDialog = (
        <ConfirmationDialog
            confirmText="Delete"
            description={
                pendingDelete
                    ? `"${pendingDelete.title}" and all of its messages will be permanently deleted.`
                    : undefined
            }
            handleConfirm={() => {
                if (pendingDelete) {
                    void deleteSession(pendingDelete);
                }
            }}
            handleOpenChange={(open) => {
                if (!open) {
                    setPendingDelete(null);
                }
            }}
            isOpen={!!pendingDelete}
            title="Delete chat?"
        />
    );

    return { confirmDialog, renameSession, requestDelete: setPendingDelete };
};
