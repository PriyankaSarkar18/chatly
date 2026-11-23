import { useEffect, useState } from 'react';
import { Camera, Heart, Trash2, Upload } from 'lucide-react';
import StatusViewer from './StatusViewer';
import StatusComposer from './StatusComposer';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';

const StatusPage = () => {
  const { user } = useAuth();
  const [feed, setFeed] = useState([]);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const socket = (window.__chatlySocket = window.__chatlySocket || null);
    const onNew = ({ status, userId }) => {
      if (userId === user?.id) {
        setFeed((prev) => [...prev.filter((group) => group.user.id !== user.id), { user, statuses: [status] }]);
      }
    };

    const onViewed = ({ statusId, viewer }) => {
      setFeed((prev) =>
        prev.map((group) =>
          group.user.id === viewer.id
            ? { ...group, statuses: group.statuses.map((status) => (status.id === statusId ? { ...status, viewedByMe: true } : status)) }
            : group
        )
      );
    };

    const socketInstance = window.__socketInstance;
    if (socketInstance) {
      socketInstance.on('status:new', onNew);
      socketInstance.on('status:viewed', onViewed);
    }

    return () => {
      if (socketInstance) {
        socketInstance.off('status:new', onNew);
        socketInstance.off('status:viewed', onViewed);
      }
    };
  }, [user?.id]);

  const load = async () => {
    try {
      const { data } = await api.get('/status/feed');
      setFeed(data.data?.statuses ?? []);
    } catch (err) {
      setFeed([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async (payload) => {
    setPosting(true);
    try {
      const { data } = await api.post('/status', payload);
      setFeed((prev) => [{ user, statuses: [data.data?.status] }, ...prev]);
      setActive(data.data?.status.id);
    } catch (err) {
      // handled inside composer
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (statusId) => {
    try {
      await api.delete(`/status/${statusId}`);
      load();
    } catch {
      // handled
    }
  };

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <StatusComposer
        open={false}
        onClose={() => {}}
        activeUser={user}
        onPost={handlePost}
        posting={posting}
      />

      <div className="flex flex-1 flex-col overflow-y-auto bg-app-bg">
        <div className="border-b border-app-border px-4 py-4">
          <h1 className="text-lg font-bold text-app-text">Status</h1>
          <p className="text-xs text-app-muted">See what your friends are up to — photos, thoughts, and moments.</p>
        </div>

        {loading && feed.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-app-border border-t-app-accent" />
          </div>
        ) : (
          <div className="px-4 py-3">
            {feed.map((group, index) => (
              <div key={group.user.id}>
                <div className="mb-2 flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-app-text">{group.user.name}</h2>
                  <span className="text-xs text-app-faint">{group.user.username}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {group.statuses.map((status) => (
                    <StatusCard
                      key={status.id}
                      status={status}
                      user={group.user}
                      active={active === status.id}
                      onClick={() => setActive(active === status.id ? null : status.id)}
                      onDelete={() => status.userId === user?.id && handleDelete(status.id)}
                    />
                  ))}
                </div>

                {index < feed.length - 1 && <div className="my-3 h-px bg-app-border" />}
              </div>
            ))}
          </div>
        )}
      </div>

      {active && <StatusViewer statusId={active} onClose={() => setActive(null)} onRefresh={load} />}
    </main>
  );
};

const StatusCard = ({ status, user, active, onClick, onDelete }) => {
  const [exceeded, setExceeded] = useState(false);

  return (
    <article className={`relative cursor-pointer rounded-2xl border border-app-border bg-app-panel p-3 transition hover:shadow-lg ${active ? 'ring-2 ring-app-accent' : ''}`} onClick={onClick}>
      <div className="aspect-[3/4] w-full rounded-xl bg-app-soft overflow-hidden flex items-center justify-center">
        {status.type === 'image' ? (
          <img src={status.mediaUrl} alt="status" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-app-muted">
            <p className="text-3xl">{status.content?.[0]?.toUpperCase() || '📝'}</p>
            <p className="text-xs truncate max-w-[160px]">{status.content}</p>
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Avatar user={user} size="xs" />
          <span className="text-xs font-semibold text-app-text">{user.name}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-app-muted">
          <span className="flex items-center gap-1">
            <Heart className="h-3.5 w-3.5" />
            {status.viewCount ?? 0}
          </span>
          {status.userId === user?.id && (
            <button type="button" className="text-app-muted transition hover:text-app-danger" onClick={(e) => { e.stopPropagation(); onDelete?.(); }}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

export default StatusPage;
