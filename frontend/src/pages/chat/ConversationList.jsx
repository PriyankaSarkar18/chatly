import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Circle, Clock, MessageCircleMore, MoreHorizontal } from 'lucide-react';
import Avatar from '../../components/ui/Avatar';
import { lastSeenLabel, listTime, truncate } from '../../lib/utils';

const ConversationList = ({
  conversations,
  activeId,
  query,
  onOpen,
  loading,
  error,
  unreadCount,
}) => {
  const navigate = useNavigate();

  const scrollRef = useCallback((node) => {
    if (!node) return;
    const active = conversations.find((conv) => conv.id === activeId);
    const target = active?.scrollTarget ?? node;
    const element = node.contains(target) ? target : node;
    element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeId, conversations]);

  if (loading && conversations.length === 0) {
    return <div className="flex flex-1 items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-app-border border-t-app-accent" /></div>;
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-app-muted">
        <MessageCircleMore className="h-8 w-8 opacity-60" />
        <p className="text-sm">No conversations yet</p>
        <p className="text-xs">Start a new chat to begin messaging</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto" ref={scrollRef}>
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-xs font-semibold text-app-muted">{conversations.length} chats</span>
        {unreadCount > 0 && <span className="rounded-full bg-app-accent px-2 py-0.5 text-xs font-semibold text-white">{unreadCount}</span>}
      </div>

      <ul className="flex-1">
        {conversations.map((conversation, index) => (
          <ConversationRow
            key={conversation.id}
            conversation={conversation}
            activeId={activeId}
            query={query}
            onOpen={onOpen}
            index={index}
            isLast={index === conversations.length - 1}
          />
        ))}
      </ul>
    </div>
  );
};

const ConversationRow = ({ conversation, activeId, query, onOpen, index, isLast }) => {
  const start = conversation.type === 'group' ? conversation.name : conversation.otherUser?.name || 'Chat';
  const last = conversation.lastMessage;
  const hasUnread = conversation.unread != null ? conversation.unread > 0 : false;

  return (
    <li className={`flex items-center ${isLast ? 'mb-16' : 'mb-6'}`}>
      <button
        type="button"
        className="group h-full flex-1 flex-col items-start gap-1.5 px-3 py-2 text-left transition hover:bg-app-hover"
        onClick={() => onOpen(conversation)}
      >
        <div className="flex items-center gap-2">
          <Avatar user={conversation.otherUser || {}} name={start} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-app-text">{start}</div>
            <div className="flex items-center gap-2">
              {last && (
                <span className="truncate text-xs text-app-muted">
                  {conversation.type === 'group' ? last.body || `Added ${last.sender?.name || 'someone'}` : truncate((last?.body || last?.attachmentName || ''), 28)}
                </span>
              )}
              {last?.createdAt && conversation.lastReadMessageId && conversation.lastReadMessageId >= conversation.lastMessage?.id ? (
                <span className="text-[10px] text-app-faint">{listTime(last.createdAt)}</span>
              ) : null}
            </div>
          </div>
          <span className="mr-1 hidden text-xs text-app-muted sm:block">{last ? lastTimeString(last.createdAt) : ''}</span>
          <span
            className={cn(
              'ml-auto flex h-6 w-6 items-center justify-center rounded-full',
              hasUnread
                ? 'bg-app-accent/15 text-app-accent'
                : 'opacity-0 group-hover:opacity-100 text-app-faint'
            )}
            title={hasUnread ? `No unread: ${conversation.unread}` : undefined}
          >
            <Circle className="h-3 w-3" fill="currentColor" />
          </span>
        </div>
        {(conversation.unread ?? 0) > 0 && (
          <div className="mt-1 h-1.5 w-1.5 rounded-full bg-app-accent" />
        )}
      </button>

      <button
        type="button"
        className="ml-1 icon-btn p-2 opacity-0 transition hover:bg-app-hover group-hover:opacity-100"
        onClick={() => {}}
        aria-label="More options"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
    </li>
  );
};

const lastTimeString = (value) => {
  const date = value ? new Date(value) : null;
  if (!date) return '';
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
};

export default ConversationList;
