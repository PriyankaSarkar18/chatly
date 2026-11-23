import { useEffect, useState } from 'react';
import { History, Phone, Trash2, Video } from 'lucide-react';
import { useCall } from '../../context/CallContext';

const CallsPage = ({ kind = 'audio' }) => {
  const { call, peerUser, startCall, endCall } = useCall();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    if (!call || call.type !== kind) return undefined;
    /* the call overlay is rendered inside the provider; this page stays as a history screen */
    return undefined;
  }, [call, kind]);

  const fetchHistory = async () => {
    try {
      const { data } = await fetch(`/api/${kind === 'video' ? 'video' : 'call'}/history`);
      setHistory(data.data?.calls ?? []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const goTo = (call) => {
    /* live calls live in the overlay; history is a log */
  };

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-app-border px-4 py-5 md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-app-accent text-white">
            {kind === 'video' ? <Video className="h-6 w-6" /> : <Phone className="h-6 w-6" />}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-app-text">
              {kind === 'video' ? 'Video calls' : 'Audio calls'}
            </h1>
            <p className="text-sm text-app-muted">
              {kind === 'video'
                ? 'Hop on a face-to-face call with anyone in your contacts.'
                : 'Jump on a quick voice call — no passwords or accounts to set up.'}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button className="card flex flex-col items-start gap-2 p-4">
            <div className="flex items-center gap-2 text-app-accent">
              <Video className="h-5 w-5" />
              <span className="text-sm font-semibold text-app-text">Start video call</span>
            </div>
            <p className="text-xs text-app-muted">
              {peerUser
                ? `Call ${peerUser.name} right now — your camera and microphone will be used.`
                : 'Pick someone from your contacts or the list to start a video call.'}
            </p>
            <span className="mt-1 text-xs font-medium text-app-accent">New</span>
          </button>

          <button className="card flex flex-col items-start gap-2 p-4">
            <div className="flex items-center gap-2 text-app-accent">
              <Phone className="h-5 w-5" />
              <span className="text-sm font-semibold text-app-text">Start voice call</span>
            </div>
            <p className="text-xs text-app-muted">
              {peerUser
                ? `Call ${peerUser.name} — no camera needed, just pick up the call.`
                : 'Pick someone from your contacts or the list to start a voice call.'}
            </p>
            <span className="mt-1 text-xs font-medium text-app-accent">Quick</span>
          </button>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-faint" />
            <input
              className="field w-full pl-9"
              placeholder={`Search ${kind === 'video' ? 'video' : 'audio'} calls…`}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        {error && <p className="text-sm text-app-danger">{error}</p>}
        {loading && history.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-app-border border-t-app-accent" />
          </div>
        )}
        {!loading && history.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-app-muted">
            <History className="h-8 w-8 opacity-50" />
            <p className="mt-2 text-sm">No calls yet</p>
            <p className="text-xs">Your call history will appear here</p>
          </div>
        )}

        <ul className="space-y-2">
          {history.map((item) => (
            <li key={item.id} className="card flex items-center gap-3 rounded-2xl p-3 transition hover:bg-app-hover">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-app-text">{item.callee?.name || 'Unknown'}</h3>
                  <span className={`text-xs ${item.type === 'video' ? 'text-app-accent' : 'text-app-muted'}`}>
                    {item.type === 'video' ? 'Video' : 'Audio'}
                  </span>
                  <span className="text-xs text-app-faint">
                    {item.status === 'ended' ? formatDuration(item.durationSeconds) : item.status}
                  </span>
                </div>
                <p className="text-xs text-app-faint">{formatDate(item.startedAt)}</p>
              </div>
              <button
                type="button"
                className="icon-btn p-2 text-app-faint hover:text-app-danger"
                onClick={() => {}}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
};

export default CallsPage;

const Search = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;

const formatDate = (value) => {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
};

const formatDuration = (seconds = 0) => {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return hrs > 0 ? `${hrs}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
};
