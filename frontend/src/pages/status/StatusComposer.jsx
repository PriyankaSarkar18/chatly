import { useState } from 'react';
import { Camera } from 'lucide-react';
import Modal from '../../components/ui/Modal';

const StatusComposer = ({ open, onClose, activeUser, onPost, posting }) => {
  const [text, setText] = useState('');
  const [type, setType] = useState('text');
  const [color, setColor] = useState('#00a884');
  const [loading, setLoading] = useState(false);

  const colors = [
    '#00a884', '#e85d5d', '#6c5ce7', '#f5a623', '#00cec9', '#ff6b9d', '#74b9ff', '#fd79a8',
  ];

  const submit = async (event) => {
    event.preventDefault();
    if (!text.trim() && type !== 'image') return;
    setLoading(true);
    try {
      await onPost({ type, content: text.trim(), backgroundColor: color });
      setText('');
    } catch (err) {
      setLoading(false);
      alert(err.message || 'Could not post status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New status" size="sm">
      <div className="pb-2">
        <div className="flex gap-2">
          <label className="label shrink-0" htmlFor="status-type">
            Post as
          </label>
          <select
            id="status-type"
            className="field flex-1"
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <option value="text">Text with colour</option>
            <option value="image">Photo / video</option>
          </select>
        </div>

        {type === 'text' ? (
          <div className="mt-2">
            <div className="flex gap-2">
              <div className="flex-1">
                <textarea
                  className="field min-h-[80px] resize-y"
                  placeholder="What's on your mind?"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  rows={4}
                  maxLength={300}
                />
                <div className="flex justify-between text-xs text-app-faint">
                  <span>{text.length}/300</span>
                  {text && <button type="button" className="underline opacity-60" onClick={() => setText('')}>Clear</button>}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-2">
            <label className="label mb-1.5 block" htmlFor="status-media">
              Choose a photo or video
            </label>
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-app-border bg-app-soft px-4 py-6 text-center transition hover:border-app-accent">
                <Camera className="h-6 w-6 text-app-muted" />
                <span className="mt-1 text-xs text-app-muted">Click to choose</span>
                <input
                  id="status-media"
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const form = new FormData();
                    form.append('media', file);
                    try {
                      const { data } = await fetch('/api/status/upload', { method: 'POST', body: form });
                      const { mediaUrl } = data.data || {};
                      if (mediaUrl) {
                        setType('image');
                        setText('');
                      }
                    } catch (err) {
                      alert(err.message || 'Upload failed');
                    }
                  }}
                />
              </label>
              {loading && <p className="text-xs text-app-accent">Uploading…</p>}
            </div>
          </div>
        )}

        {type !== 'image' && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                className="h-6 w-6 rounded-full border-2 transition"
                style={{ backgroundColor: c }}
                title={c}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-app-border px-4 py-3">
        <button type="button" className="btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Posting…' : 'Post status'}
        </button>
      </div>
    </Modal>
  );
};

export default StatusComposer;
