import { useEffect, useState } from 'react';
import { Check, Clock, Eye, X } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import { clockTime, formatFileSize } from '../../lib/utils';
import { assetUrl } from '../../lib/api';

const StatusViewer = ({ statusId, onClose, onRefresh }) => {
  const [status, setStatus] = useState(null);
  const [viewers, setViewers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [statusId]);

  useEffect(() => {
    const socket = (window.__chatlySocket = window.__chatlySocket || null);
    const onNew = ({ status: created, userId }) => {
      if (created.id === statusId) load();
    };
    const onViewed = ({ statusId: id }) => {
      if (id === statusId) load();
    };
    if (socket) {
      socket.on('status:new', onNew);
      socket.on('status:viewed', onViewed);
    }
    return () => {
      if (socket) {
        socket.off('status:new', onNew);
        socket.off('status:viewed', onViewed);
      }
    };
  }, [statusId]);

  const load = async () => {
    try {
      const [feed, viewersData] = await Promise.all([
        fetch(`/api/status/feed`).then((r) => r.json()),
        fetch(`/api/status/${statusId}/viewers`).then((r) => r.json()),
      ]);
      const group = feed.data?.statuses?.find((g) => g.statuses.some((s) => s.id === statusId));
      setStatus(group?.statuses.find((s) => s.id === statusId) ?? null);
      setViewers(viewersData.data?.viewers ?? []);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !status) return <Modal open={true} onClose={onClose} title="Loading status…" size="sm" />;
  if (!status) return <Modal open={true} onClose={onClose} title="Status not found" size="sm" />;

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={status.type === 'image' ? 'Playing' : 'Text status'}
      size="full"
      footer={
        <div className="flex justify-center gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn-primary" onClick={() => {}}>
            Watch again
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-app-accent" />
            <span className="text-sm font-semibold text-app-text">{status.userId}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-app-muted">
            <span>{clockTime(status.createdAt)}</span>
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {status.viewCount ?? 0}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-hidden rounded-2xl bg-app-soft">
          {status.type === 'image' ? (
            <video
              src={status.mediaUrl}
              className="max-h-[70vh] w-full object-cover"
              controls
              poster={status.mediaUrl}
              preload="metadata"
            />
          ) : (
            <div className="flex h-full min-h-[320px] items-center justify-center">
              <p className="text-3xl">{status.content?.[0]?.toUpperCase() || '📝'}</p>
              <p className="mt-2 max-w-lg text-sm text-app-muted">{status.content}</p>
            </div>
          )}
        </div>

        {viewers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {viewers.map((viewer) => (
              <div key={viewer.id} className="flex items-center gap-1.5 rounded-full bg-app-soft px-3 py-1.5">
                <span className="h-5 w-5 rounded-full bg-gradient-to-br from-app-accent to-transparent flex items-center justify-center text-white text-xs font-bold">
                  {viewer.name?.[0] || 'U'}
                </span>
                <span className="text-xs text-app-text">{viewer.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default StatusViewer;
