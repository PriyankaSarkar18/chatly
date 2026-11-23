import { useState } from 'react';
import { ArrowLeft, Edit, Loader2, User, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, updateUser, signOut } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', about: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!user) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-app-muted">
        <p className="text-sm">You must be signed in to view your profile.</p>
      </div>
    );
  }

  const load = async () => {
    try {
      const { data } = await fetch('/api/profile/me');
      const profile = data.data?.profile;
      updateUser(profile);
      setForm({ name: profile.name || '', about: profile.about || '', phone: profile.phone || '' });
    } catch {
      setError('Could not load your profile.');
    }
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const { data } = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      updateUser(data.data?.profile ?? {});
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <header className="flex items-center gap-3 border-b border-app-border px-4 py-4">
        <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-app-text">My profile</h1>
      </header>

      <div className="flex flex-1 flex-col gap-4 px-4 py-6">
        <div className="card flex items-center gap-4 rounded-2xl p-4">
          <div className="relative">
            <Avatar user={user} size="xl" />
            <button
              type="button"
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-app-accent text-white"
              onClick={() => {}}
            >
              <Edit className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-app-text truncate">{user.name}</h2>
            <p className="text-sm text-app-muted">@{user.username}</p>
            <p className="text-sm text-app-accent">
              <a href={`mailto:${user.email}`}>{user.email}</a>
            </p>
          </div>

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-app-soft text-lg font-semibold text-app-accent">
            {user.phone || '—'}
          </div>
        </div>

        <div className="card rounded-2xl p-4">
          <div className="flex items-center gap-2 text-app-muted text-sm">
            <User className="h-4 w-4" />
            <span className="font-medium text-app-text">About</span>
          </div>
          <p className="mt-1 text-sm text-app-text">{user.about || 'Add a short bio about yourself…'}</p>
        </div>

        <div className="card rounded-2xl p-4">
          <h2 className="text-base font-semibold text-app-text">Details</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-sm text-app-text">
              <Users className="h-4 w-4 text-app-muted" />
              <span className="font-medium">Memberships</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-app-text">
              <span className="font-medium">Joined</span>
              <span className="text-app-muted">{new Date(user.createdAt || 0).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="card rounded-2xl p-4">
          <h2 className="text-base font-semibold text-app-text">Account</h2>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="btn-primary flex-1"
              onClick={() => setEditing((v) => !v)}
            >
              {editing ? 'Cancel' : 'Edit profile'}
            </button>
          </div>

          {editing && (
            <form className="mt-3 space-y-3" onSubmit={(e) => { e.preventDefault(); save(); }}>
              <div className="grid gap-3 sm:grid-cols-2">
                <input className="field" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
                <input className="field" placeholder="Username" value={form.username || ''} onChange={(e) => setForm({ ...form, username: e.target.value })} disabled defaultValue={user?.username} />
              </div>
              <input className="field" placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" />
              <textarea className="field" placeholder="About" value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} rows={3} />
              {error && <p className="text-sm text-app-danger">{error}</p>}
              <div className="flex justify-end">
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="card rounded-2xl p-4">
          <h2 className="text-base font-semibold text-app-text">Safety</h2>
          <ul className="mt-2 space-y-2 text-sm text-app-muted">
            <li className="flex items-center gap-2">
              <a href="#" className="font-medium text-app-text hover:underline">Block & report</a>
            </li>
            <li className="flex items-center gap-2">
              <a href="#" className="font-medium text-app-text hover:underline">Chirps community guidelines</a>
            </li>
          </ul>
        </div>

        <button type="button" className="btn w-full py-3 text-app-danger" onClick={() => signOut()}>
          Sign out
        </button>
      </div>
    </main>
  );
};

export default ProfilePage;
