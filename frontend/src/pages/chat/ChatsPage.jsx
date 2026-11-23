import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Minus, Plus, Search, Users } from 'lucide-react';
import ConversationList from './ConversationList';
import ChatWindow from './ChatWindow';
import NewChatModal from './NewChatModal';
import NewGroupModal from './NewGroupModal';
import api from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { cn } from '../../lib/utils';

const ChatsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const received = useRef(false);
  const socket = getSocket();

  const load = useCallback(async (reset = true) => {
    try {
      const { data } = await api.get('/chat/conversations');
      setConversations(data.data?.conversations ?? []);
      setError('');
      if (reset) setActiveId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (socket?.connected) {
      socket.emit('conversation:join', { conversationId: activeId }, ({ ok }) => {
        if (!ok) setActiveId(null);
      });
    }
    return () => {
      if (socket?.connected && activeId) socket.emit('conversation:leave', { conversationId: activeId });
    };
  }, [activeId, socket]);

  useEffect(() => {
    const onNew = ({ message }) => {
      setConversations((list) => {
        const exists = list.some((conv) => conv.id === message.conversationId);
        if (exists) return list;
        return [{ ...message, unread: true }, ...list];
      });
      received.current = false;
    };

    const onRead = ({ conversationId, lastReadMessageId }) => {
      setConversations((list) =>
        list.map((conv) => (conv.id === conversationId ? { ...conv, lastReadMessageId } : conv))
      );
    };

    const onTyping = ({ conversationId, isTyping }) => {
      setConversations((list) =>
        list.map((conv) => (conv.id === conversationId ? { ...conv, typingBy: isTyping ? conv.typingBy || [] : [] } : conv))
      );
    };

    const onPresence = ({ userId, isOnline }) => {
      setConversations((list) =>
        list.map((conv) => {
          if (conv.type !== 'direct' || conv.otherUser.id !== userId) return conv;
          return { ...conv, otherUser: { ...conv.otherUser, isOnline } };
        })
      );
    };

    socket.on('message:new', onNew);
    socket.on('message:read', onRead);
    socket.on('chat:typing', onTyping);
    socket.on('presence:update', onPresence);

    return () => {
      socket.off('message:new', onNew);
      socket.off('message:read', onRead);
      socket.off('chat:typing', onTyping);
      socket.off('presence:update', onPresence);
    };
  }, [socket]);

  const openConversation = useCallback(
    (conversation) => {
      if (conversation.id === activeId) return;
      socket.emit('conversation:join', { conversationId: conversation.id }, ({ ok }) => {
        if (ok) setActiveId(conversation.id);
      });
    },
    [socket]
  );

  const closeConversation = useCallback(() => {
    setActiveId(null);
    socket.emit('conversation:leave', { conversationId: activeId });
  }, [socket]);

  const handleCreateDirect = async (userId) => {
    const { data } = await api.post('/chat/conversations/direct', { userId });
    const conversation = data.data?.conversation;
    setConversations((list) => [conversation, ...list]);
    setNewChatOpen(false);
    navigate(`/chat/${conversation.id}`);
  };

  const handleCreateGroup = async (payload) => {
    const { data } = await api.post('/chat/conversations/group', payload);
    const conversation = data.data?.conversation;
    setConversations((list) => [conversation, ...list]);
    setNewGroupOpen(false);
    navigate(`/chat/${conversation.id}`);
  };

  const active = conversations.find((conv) => conv.id === activeId) || null;
  const query = new URLSearchParams(location.search);
  const fallbackId = query.get('id');

  useEffect(() => {
    if (fallbackId && conversations.some((conv) => conv.id === Number(fallbackId))) {
      setActiveId(Number(fallbackId));
    }
  }, [fallbackId, conversations]);

  if (loading && conversations.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-app-border border-t-app-accent" />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <section
        className={cn(
          'flex flex-1 flex-col border-r border-app-border bg-app-bg md:w-[380px]',
          activeId ? 'hidden md:block' : 'block'
        )}
      >
        <div className="flex items-center gap-3 border-b border-app-border px-3 py-3">
          <div className="flex-1 relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-faint" />
            <input
              className="field w-full pl-9"
              placeholder="Search or start a new chat"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          </div>
          <div className="ml-1 flex gap-2">
            <button type="button" className="icon-btn" onClick={() => setNewGroupOpen(true)} title="New group">
              <Plus className="h-5 w-5" />
            </button>
            <button type="button" className="icon-btn" onClick={() => setNewChatOpen(true)} title="New chat">
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>

        <ConversationList
          conversations={conversations}
          activeId={activeId}
          query={query.get('id')}
          onOpen={openConversation}
          loading={loading}
          error={error}
          unreadCount={conversations.reduce((sum, conv) => sum + (conv.unread ?? 0), 0)}
        />
      </section>

      <ChatWindow conversation={active} onClose={closeConversation} />

      <NewChatModal
        open={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        onSend={handleCreateDirect}
        contacts={conversations.filter((conv) => conv.type === 'direct').map((conv) => ({
          id: conv.otherUser?.id,
          name: conv.otherUser?.name,
          avatarUrl: conv.otherUser?.avatarUrl,
        }))}
      />

      <NewGroupModal
        open={newGroupOpen}
        onClose={() => setNewGroupOpen(false)}
        onSend={handleCreateGroup}
        contacts={conversations
          .filter((conv) => conv.type === 'group')
          .map((conv) => ({ id: conv.id, name: conv.name, avatarUrl: conv.name ? null : null }))}
      />
    </div>
  );
};

export default ChatsPage;
