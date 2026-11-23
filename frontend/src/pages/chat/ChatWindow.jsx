import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, PhoneOutgoing, Video, VideoOff } from 'lucide-react';
import Avatar from '../../components/ui/Avatar';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import { dayLabel, clockTime, listTime, lastSeenLabel } from '../../lib/utils';
import { useCall } from '../../context/CallContext';

const ChatWindow = ({ conversation, onClose }) => {
  const navigate = useNavigate();
  const { endCall } = useCall();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [before, setBefore] = useState(null);
  const [sending, setSending] = useState(false);
  const [typingBy, setTypingBy] = useState([]);
  const [unread, setUnread] = useState(0);
  const [localTyping, setLocalTyping] = useState(false);
  const messagesEnd = useRef(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const otherUser = conversation?.type === 'direct' ? conversation.otherUser : null;
  const onMyMessage = (message) => message.sender?.id === conversation?.userSenderId ?? false;

  const loadMessages = async (reset) => {
    if (!conversation) return;
    try {
      const params = new URLSearchParams({ limit: 40 });
      if (reset) setBefore(null);
      else if (before) params.set('before', String(before));
      const { data } = await fetchMessages(params.toString());
      const { messages, hasMore } = data?.data ?? {};
      setMessages((prev) => (reset ? messages : [...prev, ...messages]));
      setHasMore(hasMore);
      if (!reset && messages.length) setBefore(messages[messages.length - 1]?.id ?? before);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (query) => {
    const { data } = await api.get(`/chat/conversations/${conversation.id}/messages?${query}`);
    return data;
  };

  const sendMessage = async (payload) => {
    const { data } = await api.post(`/chat/conversations/${conversation.id}/messages`, payload);
    const message = data.data?.message;
    setMessages((prev) => [message, ...prev]);
    return message;
  };

  const onSend = async (body, type = 'text', attachment = null) => {
    if (!body.trim() && !attachment) return;
    setSending(true);
    try {
      const message = await sendMessage({ body: body.trim(), type, attachment });
      socket.emit('conversation:join', { conversationId: conversation.id }, () => {});
      if (message.readBy?.length === 0 && message.sender?.id !== conversation.userId) {
        // delivered via socket event below; just rely on realtime
      }
      return message;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!conversation) return;
    loadMessages(true);
    setUnread(0);
  }, [conversation?.id]);

  useEffect(() => {
    if (!conversation) return;
    const handle = (event) => {
      if (event.message.conversationId === conversation.id && event.message.sender?.id !== conversation.userId) {
        setMessages((prev) => [event.message, ...prev]);
        setUnread((n) => n + 1);
      }
      if (event.message?.sender?.id === conversation.userId) {
        // last message just arrived from this user; no action needed, it was already appended
      }
    };
    socket.on('message:new', handle);
    return () => socket.off('message:new', handle);
  }, [conversation?.id, conversation?.userId]);

  useEffect(() => {
    if (!conversation) return () => {};
    const onRead = ({ lastReadMessageId }) => {
      if (lastReadMessageId >= (messages[0]?.id ?? 0)) setUnread(0);
    };
    socket.on('message:read', onRead);
    return () => socket.off('message:read', onRead);
  }, [conversation?.id, messages]);

  useEffect(() => {
    if (!conversation) return;
    socket.emit('conversation:join', { conversationId: conversation.id }, () => {});
    return () => socket.emit('conversation:leave', { conversationId: conversation.id });
  }, [conversation?.id]);

  useEffect(() => {
    if (!conversation) return;
    const onTyping = ({ isTyping }) => {
      if (isTyping) setTypingBy((prev) => [...new Set([...prev, conversation.typingBy?.find((u) => u.id !== conversation.userId)?.id] || [])]);
    };
    socket.on('chat:typing', onTyping);
    return () => socket.off('chat:typing', onTyping);
  }, [conversation?.id, conversation?.userId]);

  useEffect(() => {
    if (!conversation) return;
    const onPresence = ({ userId, isOnline }) => {
      setTypingBy((prev) => prev.filter((id) => id !== userId));
    };
    socket.on('presence:update', onPresence);
    return () => socket.off('presence:update', onPresence);
  }, [conversation?.id]);

  useEffect(() => {
    if (messagesEnd.current) messagesEnd.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, conversation?.id, unread]);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [conversation?.id]);

  const scrollToBottom = () => {
    if (messagesEnd.current) messagesEnd.current.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = (event) => {
    const el = event.currentTarget;
    if (el.scrollTop < 40 && hasMore) loadMessages(false);
  };

  const goBack = () => {
    if (conversation && conversation.id) {
      navigate(-1);
    } else {
      navigate('/chat');
    }
  };

  const bottomActions = conversation && conversation.userId ? (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        className="icon-btn"
        title={conversation.type === 'video' ? 'Switch to audio' : 'Switch to video'}
        onClick={() => {}}
      >
        {conversation?.type === 'video' ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
      </button>
      <button
        type="button"
        className="icon-btn"
        title="Start a call"
        onClick={() => {}}
      >
        <Phone className="h-4 w-4" />
      </button>
    </div>
  ) : null;

  return (
    <div
      className={`flex flex-1 flex-col bg-app-bg ${
        activeConversation ? 'relative z-10' : 'hidden md:flex'
      }`}
    >
      {conversation ? (
        <>
          <header className="flex items-center gap-3 border-b border-app-border px-3 py-2">
            <button type="button" className="icon-btn" onClick={goBack}>
              <ArrowLeft className="h-5 w-5" />
            </button>
            <Avatar user={otherUser || {}} name={conversation?.name || 'Chat'} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-app-text">
                {conversation?.type === 'direct' ? (otherUser?.name || 'Messages') : conversation?.name || 'Group chat'}
              </div>
              <div className="flex items-center gap-2 text-xs text-app-muted">
                <span>
                  {conversation.type === 'direct' ? lastSeenLabel(otherUser?.lastSeen) : 'On the go'}
                </span>
                {conversation.type === 'direct' && conversation.otherUser?.isOnline && (
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                )}
                {conversation.lastMessageAt && <span className="text-app-faint">|</span>}
                {conversation.lastMessageAt && <span className="text-app-faint">{listTime(conversation.lastMessageAt)}</span>}
              </div>
            </div>
            <button type="button" className="icon-btn" onClick={endCall} title="End call">
              <Video className="h-4 w-4" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-3 py-4" onScroll={handleScroll}>
            {!messages.length && !loading && (
              <div className="flex h-full flex-col items-center justify-center text-app-muted">
                <p className="text-sm">No messages yet</p>
                <p className="mt-1 text-xs">Say hello to start the conversation</p>
              </div>
            )}

            {loading && messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-app-border border-t-app-accent" />
                <span className="text-xs text-app-faint">Loading messages...</span>
              </div>
            )}

            {error && !loading && (
              <div className="flex items-center gap-2 rounded-xl border border-app-danger/30 bg-app-danger/10 px-4 py-3 text-sm text-app-danger">
                <span>{error}</span>
                <button type="button" className="font-semibold text-app-danger/80 underline" onClick={() => loadMessages(true)}>
                  Retry
                </button>
              </div>
            )}

            <div className="flex flex-col gap-2 pb-2">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isSelf={message.sender?.id === conversation.userId}
                  otherUser={otherUser}
                  conversationId={conversation.id}
                  unread={unread}
                  onClearError={() => setError('')}
                />
              ))}
              <div ref={messagesEnd} />
            </div>
          </div>

          <MessageInput
            ref={inputRef}
            onSend={onSend}
            disabled={sending}
            typing={localTyping}
            onTypingChange={setLocalTyping}
            partnerName={otherUser?.name || 'Someone'}
          />

          {bottomActions}
        </>
      ) : (
        <div className="flex h-full flex-col items-center justify-center text-app-muted">
          <p className="text-lg font-semibold text-app-text">Select a chat</p>
          <p className="mt-1 text-sm">Choose a conversation from the list to start messaging</p>
        </div>
      )}
    </div>
  );
};

export default ChatWindow;
