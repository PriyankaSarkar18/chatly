import { useRef, useState } from 'react';
import { PhoneOutgoing, PhoneIncoming, Trash2, Video, VideoOff } from 'lucide-react';
import Avatar from '../../components/ui/Avatar';
import { clockTime, formatDuration, formatFileSize, truncate } from '../../lib/utils';

const Bubble = ({ message, isSelf, conversationId }) => {
  const [deleting, setDeleting] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const actionsRef = useRef(null);

  const handleAction = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setShowActions((value) => !value);
  };

  if (message.deleted) {
    return (
      <div className={`flex items-start gap-2 px-3 pb-2 ${isSelf ? 'text-app-faint' : ''}`}>
        {isSelf ? <Avatar name="You" size="xs" /> : null}
        <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${isSelf ? 'bg-app-soft' : 'bg-app-soft'}`}>
          <p className="text-xs">This message was deleted</p>
        </div>
        {!isSelf && (
          <button type="button" className="icon-btn p-1.5 text-app-faint hover:text-app-danger" onClick={handleAction}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex gap-1.5 ${
        message.sender?.id === conversationId ? 'flex-row justify-end' : 'flex-row'
      }`}
    >
      {!isSelf && (
        <button
          type="button"
          className="icon-btn p-1.5 text-app-faint hover:text-app-text"
          onClick={handleAction}
          aria-label="Message options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      )}

      <div
        className={`max-w-[80%] flex flex-col gap-0.5 px-3 py-2 ${
          isSelf ? 'bubble-out' : 'bubble-in'
        }`}
      >
        <div
          className={`flex items-center gap-2 text-xs ${isSelf ? 'text-app-muted' : 'text-app-text'}`}
        >
          {isSelf && <span className="font-semibold text-app-accent">You</span>}
          <span className="text-app-faint">{clockTime(message.createdAt)}</span>
        </div>

        <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
          isSelf ? 'bg-app-accent/15 text-app-text' : 'bg-app-soft'
        }`}>
          {message.type === 'text' && <p>{message.body}</p>}
          {message.type === 'image' && (
            <>
              <img
                src={assetUrl(message.attachmentUrl)}
                alt="attachment"
                className="max-h-64 w-full rounded-xl object-cover"
                loading="lazy"
              />
              <div className="mt-1 text-xs text-app-muted">{formatFileSize(message.attachmentSize)}</div>
            </>
          )}
          {message.type === 'video' && (
            <div className="max-h-56 overflow-hidden rounded-xl">
              <video
                src={assetUrl(message.attachmentUrl)}
                className="w-full"
                controls
                poster={message.attachmentUrl}
                preload="metadata"
              />
              <div className="mt-1 text-xs text-app-muted">{formatFileSize(message.attachmentSize)}</div>
            </div>
          )}
          {message.type === 'audio' && (
            <div className="flex items-center gap-3 rounded-xl bg-black/20 px-3 py-2">
              <audio src={assetUrl(message.attachmentUrl)} className="hidden" controls />
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-black/30">
                <div className="h-full w-1/2 rounded-full bg-white/70" />
              </div>
              <span className="text-xs text-white/80">Voice message</span>
            </div>
          )}
          {message.type === 'file' && (
            <div className="flex items-center gap-2 rounded-xl bg-app-soft px-3 py-2">
              <span className="text-base">📎</span>
              <div>
                <p className="text-xs font-medium text-app-text">{message.attachmentName}</p>
                <p className="text-xs text-app-muted">{formatFileSize(message.attachmentSize)}</p>
              </div>
            </div>
          )}
        </div>

        {isSelf && message.readBy?.length > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-app-faint">
            <span>{message.readBy.length} read</span>
          </div>
        )}
      </div>

      {isSelf && (
        <button
          type="button"
          className="icon-btn p-1.5 text-app-faint hover:text-app-danger"
          onClick={handleAction}
          aria-label="Delete message"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}

      <button
        type="button"
        className="flex h-full flex-col items-end gap-1"
        onClick={() => setShowActions((value) => !value)}
      >
        {!isSelf && (
          <span className="flex items-center gap-1.5 text-xs text-app-muted">
            {message.sender?.name}
            {message.sender?.id !== conversationId && (
              <span className="flex items-center gap-1">
                {message.readBy?.includes(conversationId) ? <span>read</span> : <span className="flex items-center">—</span>}
              </span>
            )}
          </span>
        )}
      </button>
    </div>
  );
};

const MoreHorizontal = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="4" cy="8" r="1.4" /><circle cx="8" cy="8" r="1.4" /><circle cx="12" cy="8" r="1.4" /></svg>;

export default Bubble;
