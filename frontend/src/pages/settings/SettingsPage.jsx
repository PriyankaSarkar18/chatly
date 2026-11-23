import { useEffect, useState } from 'react';
import { Save, User, Palette, Shield, Users } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/ui/Avatar';

const SettingsPage = () => {
  const { user, updateUser } = useAuth();
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({ name: '', about: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('account');

  useEffect(() => {
    loadSettings();
    loadProfile();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await fetch('/api/settings');
      setSettings(data.data?.settings ?? {});
    } catch {
      setSettings({});
    }
  };

  const loadProfile = async () => {
    try {
      const { data } = await fetch('/api/profile/me');
      const profile = data.data?.profile ?? {};
      updateUser(profile);
      setForm({
        name: profile.name ?? '',
        about: profile.about ?? '',
        phone: profile.phone ?? '',
      });
    } catch {
      // handled
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { data } = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setSettings(data.data?.settings ?? {});
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggle = (key) => {
    setForm((prev) => ({ ...prev, [key]: !prev[key] }));
    handleSave({ preventDefault: () => {} });
  };

  const saveProfile = async () => {
    setSaving(true);
    setError('');
    try {
      const { data } = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      updateUser(data.data?.profile ?? {});
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-app-border px-4 py-5 md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-app-accent text-white">
            <User className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-app-text">Settings</h1>
            <p className="text-sm text-app-muted">Tune how Chatly looks, sounds and behaves.</p>
          </div>
        </div>

        <div className="flex gap-2">
          {['account', 'theme', 'notifications', 'privacy'].map((key) => (
            <button
              key={key}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                tab === key ? 'bg-app-accent/15 text-app-accent' : 'text-app-muted hover:text-app-text'
              }`}
              onClick={() => setTab(key)}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        {tab === 'account' && (
          <div className="card rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-app-soft text-lg font-semibold text-app-accent">
                {(user?.name || 'U').split(' ').map((p) => p[0]).join('')}
              </div>
              <div>
                <h2 className="text-base font-semibold text-app-text">{user?.name}</h2>
                <p className="text-xs text-app-muted">@{user?.username}</p>
                <p className="text-xs text-app-muted">{user?.email}</p>
              </div>
            </div>

            <form className="mt-4 space-y-4" onSubmit={handleSave}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="name">Full name</label>
                  <input className="field" id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor="phone">Phone <span className="normal-case text-app-faint">(optional)</span></label>
                  <input className="field" id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="about">About</label>
                <textarea
                  className="field"
                  id="about"
                  value={form.about}
                  onChange={(e) => setForm({ ...form, about: e.target.value })}
                  rows={3}
                  maxLength={160}
                />
                <p className="mt-1 text-xs text-app-faint">{form.about.length}/160</p>
              </div>
              <div className="flex justify-end">
                <button type="submit" className="btn-primary" disabled={saving}>
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        )}

        {tab === 'theme' && (
          <div className="card rounded-2xl p-5">
            <h2 className="text-base font-semibold text-app-text">Theme</h2>
            <p className="mt-1 text-xs text-app-muted">Choose how Chatly looks across the app.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                { key: 'dark', label: 'Dark', className: 'bg-[#0b141a]', preview: 'bg-[#182229]' },
                { key: 'light', label: 'Light', className: 'bg-[#f0f2f5]', preview: 'bg-[#ffffff]' },
              ].map(({ key, label, className, preview }) => (
                <button
                  key={key}
                  type="button"
                  className="card flex flex-col items-center gap-2 rounded-2xl p-4 transition hover:shadow-lg"
                  style={{ borderColor: settings?.theme === key ? 'var(--app-accent)' : 'var(--border)' }}
                  onClick={() => setSettings((prev) => ({ ...prev, theme: key }))}
                >
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-app-muted" />
                    <span className="text-sm font-semibold text-app-text">{label}</span>
                  </div>
                  <div className={`h-10 w-full rounded-xl ${className}`} />
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'notifications' && (
          <div className="card rounded-2xl p-5">
            <h2 className="text-base font-semibold text-app-text">Notifications</h2>
            <p className="mt-1 text-xs text-app-muted">Decide which alerts you receive.</p>
            <div className="mt-4 space-y-3">
              {[
                { key: 'notifications', label: 'All notifications', description: 'Get alerts for every message' },
                { key: 'messageSound', label: 'Message sound', description: 'Play a tone when a message arrives' },
                { key: 'readReceipts', label: 'Read receipts', description: 'Show when others have read your messages' },
                { key: 'lastSeenVisible', label: 'Show last seen', description: 'Let others see when you were last online' },
              ].map(({ key, label, description }) => (
                <label key={key} className="flex items-center justify-between py-2">
                  <span className="text-sm text-app-text">{label}</span>
                  <button
                    type="button"
                    className="relative h-6 w-11 rounded-full transition"
                    style={{
                      backgroundColor: settings?.[key] ? 'var(--app-accent)' : 'var(--border)',
                      boxShadow: settings?.[key] ? 'var(--app-accent) 0 0 0 4px' : 'transparent',
                    }}
                    onClick={() => toggle(key)}
                  >
                    <span
                      className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition"
                      style={{ transform: settings?.[key] ? 'translateX(22px)' : 'translateX(0)' }}
                    />
                  </button>
                </label>
              ))}
            </div>
          </div>
        )}

        {tab === 'privacy' && (
          <div className="card rounded-2xl p-5">
            <h2 className="text-base font-semibold text-app-text">Privacy</h2>
            <p className="mt-1 text-xs text-app-muted">Control who can see your content.</p>
            <div className="mt-4">
              <label className="label" htmlFor="status-privacy">Status privacy</label>
              <select
                id="status-privacy"
                className="field mt-1"
                value={settings?.statusPrivacy || 'everyone'}
                onChange={(e) => setSettings((prev) => ({ ...prev, statusPrivacy: e.target.value }))}
              >
                <option value="everyone">Everyone</option>
                <option value="contacts">My contacts</option>
              </select>
            </div>

            <div className="mt-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-app-text">Profile photo</p>
                <p className="text-xs text-app-muted">Anyone can see your photo</p>
              </div>
              <label
                htmlFor="avatar-file"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-app-soft transition hover:bg-app-hover"
              >
                <Avatar user={user} size="lg" />
                <span className="sr-only">Change photo</span>
              </label>
              <input
                id="avatar-file"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  // TODO: wire /api/profile/avatar when MVP is done
                  e.target.value = '';
                }}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default SettingsPage;
