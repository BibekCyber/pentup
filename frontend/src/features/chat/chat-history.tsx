import { MessageSquare, MoreHorizontal, Pencil, Search, SquarePen, Trash } from 'lucide-react';
import { useMemo, useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { type ChatSession, groupChatSessions } from './chat-utils';
import { useChatSessions } from './use-chat';
import { useChatSessionActions } from './use-chat-session-actions';

interface ChatHistoryItemProps {
    isActive: boolean;
    onDelete: (session: ChatSession) => void;
    onNavigate?: () => void;
    onRename: (session: ChatSession, title: string) => Promise<boolean>;
    session: ChatSession;
}

interface ChatHistoryProps {
    className?: string;
    // Called after navigating, e.g. to close the mobile sheet.
    onNavigate?: () => void;
}

const ChatHistoryItem = ({ isActive, onDelete, onNavigate, onRename, session }: ChatHistoryItemProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState(session.title);

    const finishEditing = async (save: boolean) => {
        const title = draft.trim();

        if (save && title && title !== session.title) {
            if (!(await onRename(session, title))) {
                return;
            }
        }

        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <li className="px-1">
                <input
                    aria-label="Chat title"
                    autoFocus
                    className="bg-well border-primary/60 h-8 w-full rounded-md border px-2.5 text-[13px] outline-none"
                    maxLength={80}
                    onBlur={() => void finishEditing(true)}
                    onChange={(event) => setDraft(event.target.value)}
                    onFocus={(event) => event.target.select()}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            void finishEditing(true);
                        } else if (event.key === 'Escape') {
                            setDraft(session.title);
                            setIsEditing(false);
                        }
                    }}
                    value={draft}
                />
            </li>
        );
    }

    return (
        <li className="group/item relative">
            <NavLink
                className={cn(
                    'text-foreground/85 hover:bg-sidebar-accent hover:text-foreground flex h-8 items-center rounded-md pr-8 pl-2.5 text-[13px] transition-colors',
                    isActive &&
                        "bg-brand-tint text-foreground before:bg-primary relative font-medium before:absolute before:top-1.5 before:bottom-1.5 before:left-0 before:w-[3px] before:rounded-r-full before:content-['']",
                )}
                onClick={onNavigate}
                title={session.title}
                to={`/chat/${session.id}`}
            >
                <span className="truncate">{session.title}</span>
            </NavLink>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        aria-label={`Actions for ${session.title}`}
                        className={cn(
                            'text-muted-foreground hover:text-foreground data-[state=open]:bg-accent absolute top-1 right-1 flex size-6 items-center justify-center rounded-sm opacity-0 transition-opacity group-hover/item:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100',
                            isActive && 'opacity-100',
                        )}
                        type="button"
                    >
                        <MoreHorizontal className="size-4" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="start"
                    className="w-40"
                >
                    <DropdownMenuItem
                        onSelect={() => {
                            setDraft(session.title);
                            setIsEditing(true);
                        }}
                    >
                        <Pencil />
                        Rename
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className="text-destructive focus:text-destructive [&_svg]:text-destructive"
                        onSelect={() => onDelete(session)}
                    >
                        <Trash />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </li>
    );
};

/**
 * Session history rail: new chat, title search and the user's chats grouped by
 * last activity.
 */
export const ChatHistory = ({ className, onNavigate }: ChatHistoryProps) => {
    const navigate = useNavigate();
    const { sessionId } = useParams<{ sessionId: string }>();
    const { isLoading, sessions } = useChatSessions();
    const { confirmDialog, renameSession, requestDelete } = useChatSessionActions();
    const [search, setSearch] = useState('');

    const groups = useMemo(() => groupChatSessions(sessions, search), [sessions, search]);

    return (
        <aside className={cn('bg-sidebar/40 flex min-h-0 flex-col', className)}>
            <div className="flex flex-col gap-2.5 p-3">
                <Button
                    className="w-full justify-start"
                    onClick={() => {
                        navigate('/chat');
                        onNavigate?.();
                    }}
                    variant="outline"
                >
                    <SquarePen />
                    New chat
                </Button>
                <div className="bg-well border-border focus-within:border-border-strong flex h-8 items-center gap-2 rounded-md border px-2.5 transition-colors">
                    <Search className="text-muted-foreground size-3.5 shrink-0" />
                    <input
                        aria-label="Search chats"
                        className="placeholder:text-muted-foreground w-full bg-transparent text-[13px] outline-none"
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search chats"
                        type="text"
                        value={search}
                    />
                </div>
            </div>

            <nav
                aria-label="Chat history"
                className="min-h-0 flex-1 overflow-y-auto px-2 pb-3"
            >
                {isLoading ? (
                    <div className="flex flex-col gap-2 px-1 pt-2">
                        {Array.from({ length: 6 }, (_, index) => (
                            <Skeleton
                                className="h-6 w-full"
                                key={index}
                            />
                        ))}
                    </div>
                ) : groups.length === 0 ? (
                    <div className="text-muted-foreground flex flex-col items-center gap-2 px-4 pt-10 text-center text-[13px]">
                        <MessageSquare className="size-5 opacity-60" />
                        {search ? 'No chats match your search' : 'Your chats will appear here'}
                    </div>
                ) : (
                    groups.map((group) => (
                        <section
                            className="mt-2 first:mt-0"
                            key={group.label}
                        >
                            <h3 className="text-muted-foreground px-2.5 pt-2 pb-1 font-mono text-[10.5px] tracking-[0.1em] uppercase">
                                {group.label}
                            </h3>
                            <ul className="flex flex-col gap-0.5">
                                {group.sessions.map((session) => (
                                    <ChatHistoryItem
                                        isActive={String(session.id) === sessionId}
                                        key={session.id}
                                        onDelete={requestDelete}
                                        onNavigate={onNavigate}
                                        onRename={renameSession}
                                        session={session}
                                    />
                                ))}
                            </ul>
                        </section>
                    ))
                )}
            </nav>
            {confirmDialog}
        </aside>
    );
};
