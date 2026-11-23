export const cn = (...values) => values.filter(Boolean).join(' ');

export const initials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || '?';

const AVATAR_COLORS = [
  'from-emerald-500 to-teal-600',
  'from-sky-500 to-blue-600',
  'from-violet-500 to-purple-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-teal-600',
];

export const avatarGradient = (seed = '') => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 9973;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

export const toDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const isSameDay = (a, b) => {
  const first = toDate(a);
  const second = toDate(b);
  if (!first || !second) return false;
  return first.toDateString() === second.toDateString();
};

export const clockTime = (value) => {
  const date = toDate(value);
  if (!date) return '';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

export const listTime = (value) => {
  const date = toDate(value);
  if (!date) return '';

  const now = new Date();
  if (isSameDay(date, now)) return clockTime(date);

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return 'Yesterday';

  const weekAgo = new Date();
  weekAgo.setDate(now.getDate() - 7);
  if (date > weekAgo) return date.toLocaleDateString([], { weekday: 'short' });

  return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
};

export const dayLabel = (value) => {
  const date = toDate(value);
  if (!date) return '';
  const now = new Date();
  if (isSameDay(date, now)) return 'Today';

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return 'Yesterday';

  return date.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
};

export const lastSeenLabel = (value) => {
  const date = toDate(value);
  if (!date) return 'offline';
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMinutes < 1) return 'last seen just now';
  if (diffMinutes < 60) return `last seen ${diffMinutes}m ago`;
  if (isSameDay(date, new Date())) return `last seen today at ${clockTime(date)}`;
  return `last seen ${listTime(date)} at ${clockTime(date)}`;
};

export const formatDuration = (seconds = 0) => {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return hrs > 0 ? `${hrs}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
};

export const formatFileSize = (bytes) => {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export const hoursLeft = (expiresAt) => {
  const date = toDate(expiresAt);
  if (!date) return '';
  const diff = date.getTime() - Date.now();
  if (diff <= 0) return 'expired';
  const hours = Math.floor(diff / 3600000);
  return hours >= 1 ? `${hours}h left` : `${Math.max(1, Math.floor(diff / 60000))}m left`;
};

export const truncate = (text = '', max = 80) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

export const previewOf = (message) => {
  if (!message) return 'No messages yet';
  if (message.deleted) return 'This message was deleted';
  if (message.type === 'image') return '📷 Photo';
  if (message.type === 'video') return '🎥 Video';
  if (message.type === 'audio') return '🎤 Voice message';
  if (message.type === 'file') return `📎 ${message.attachmentName || 'Attachment'}`;
  return message.body || '';
};
