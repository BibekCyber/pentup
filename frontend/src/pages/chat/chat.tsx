import { Outlet, useParams } from 'react-router-dom';

import { ChatConversation } from '@/features/chat/chat-conversation';
import { ChatHistory } from '@/features/chat/chat-history';
import { useChatSessionsSubscriptions } from '@/features/chat/use-chat';

/** History rail beside the routed conversation; keeps the session list live. */
export const ChatLayout = () => {
    useChatSessionsSubscriptions();

    return (
        <div className="flex h-dvh min-h-0 w-full min-w-0">
            <ChatHistory className="border-border hidden w-64 shrink-0 border-r md:flex" />
            <Outlet />
        </div>
    );
};

const Chat = () => {
    const { sessionId } = useParams<{ sessionId: string }>();

    // Keyed so switching chats starts from a clean composer and scroll state.
    return (
        <ChatConversation
            key={sessionId ?? 'new'}
            sessionId={sessionId ?? null}
        />
    );
};

export default Chat;
