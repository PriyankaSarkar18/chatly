import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { Paperclip, Send, Smile, Mic, X } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';

/** Lazily get the default emoji dataset only when the user picks an emoji. */
const getDefaultEmojiData = async () => {
  // Import the package's own `./data` entry instead of a file the package does not ship.
  // Its `exports` map points `default` to `./dist/data/index.js`, so this resolves
  // under both CJS and ESM resolution paths and avoids the build error for an
  // incorrect specifier. That file is only read at runtime when an emoji is picked,
  // so deferring the import keeps the initial bundle lightweight.
  const { default: emojiData } = await import('emoji-picker-react/data');
  return emojiData;
};

const MessageInput = forwardRef(({ onSend, disabled, typing, onTypingChange, partnerName }, ref) => {
  const [draft, setDraft] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [localTyping, setLocalTyping] = useState(false);
  const textarea = useRef(null);

  useImperativeHandle(ref, () => ({
    focus() {
      textarea.current?.focus();
    },
  }));

  useEffect(() => {
    if (typing) setLocalTyping(true);
  }, [typing]);

  useEffect(() => {
    if (!typing) setLocalTyping(false);
  }, [typing]);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!draft.trim() && !localTyping) return;

      if (localTyping) {
        onTypingChange?.(false);
        return;
      }

      onSend?.(draft, 'text');
      setDraft('');
      setLocalTyping(false);
    },
    [draft, localTyping, onSend, onTypingChange]
  );

  const handleChange = useCallback(
    (event) => {
      const value = event.target.value;
      setDraft(value);
      if (value.length > 0) {
        onTypingChange?.(true);
        clearTimeout(window.__typingTimer);
        window.__typingTimer = setTimeout(() => onTypingChange?.(false), 1200);
      } else {
        onTypingChange?.(false);
      }
    },
    [onTypingChange]
  );

  const pickEmoji = useCallback((emoji) => {
    setPickerOpen(false);
    setDraft((current) => current + (emoji.skinVariant ?? emoji.char));
  }, []);

  return (
    <div className="flex items-end gap-2 border-t border-app-border bg-app-panel px-3 py-3">
      <button
        type="button"
        className="icon-btn"
        onClick={() => setPickerOpen((open) => !open)}
        aria-label="Emoji picker"
      >
        <Smile className="h-5 w-5" />
      </button>

      <div className="flex flex-1 gap-1.5">
        <button
          type="button"
          className="icon-btn"
          onClick={() => {
            onSend(draft, 'file', { name: 'memo.txt', size: 1200 });
            setDraft('');
          }}
          aria-label="Attach file"
        >
          <Paperclip className="h-4 w-4" />
        </button>

        <EmojiPicker
          open={pickerOpen}
          onSelect={pickEmoji}
          autoFocus={false}
          onBackdropClick={() => setPickerOpen(false)}
          theme="dark"
          width={320}
        />

        <form className="relative flex flex-1 items-end" onSubmit={handleSubmit}>
          <textarea
            ref={textarea}
            className="field min-h-[44px] max-h-[160px] flex-1 resize-y rounded-2xl px-4 py-3 text-sm leading-relaxed outline-none placeholder:text-app-faint"
            placeholder={`Message ${partnerName}...`}
            value={draft}
            onChange={handleChange}
            rows={1}
            autoComplete="off"
            onKeyDown={(event) => {
              if (event.key === 'Escape') setPickerOpen(false);
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleSubmit(event);
              }
            }}
            style={{ lineHeight: '1.4' }}
          />
        </form>
      </div>

      <button
        type="button"
        className="icon-btn"
        onClick={() => {
          setDraft((current) => current.slice(0, -1));
          onTypingChange?.(false);
        }}
        aria-label="Delete last character"
        tabIndex={-1}
      >
        <X className="h-4 w-4" />
      </button>

      <button
        type="button"
        className="icon-btn"
        onClick={() => onSend(draft, 'audio')}
        disabled={!draft.trim()}
        aria-label="Send voice message"
      >
        <Mic className="h-5 w-5" />
      </button>

      <button
        type="submit"
        className="icon-btn"
        disabled={!draft.trim()}
        aria-label="Send message"
      >
        <Send className="h-5 w-5" />
      </button>
    </div>
  );
});

export default MessageInput;
