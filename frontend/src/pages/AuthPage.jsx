import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Lock, Mail, MessageCircleMore, Phone, User, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const EMPTY = { name: '', username: '', email: '', phone: '', identifier: '', password: '' };

const AuthPage = ({ mode = 'login' }) => {
  const isRegister = mode === 'register';
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);

    try {
      if (isRegister) {
        await register({
          name: form.name.trim(),
          username: form.username.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          password: form.password,
        });
      } else {
        await login(form.identifier.trim(), form.password);
      }
      navigate('/chat', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-app-bg">
      <aside className="relative hidden w-[45%] flex-col justify-between overflow-hidden bg-app-accent p-12 text-white lg:flex">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10" />
        <div className="absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-black/10" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <MessageCircleMore className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">Chatly</span>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-4xl font-bold leading-tight">
            Messages, calls and status — all in one place.
          </h1>
          <p className="mt-4 text-sm text-white/80">
            Chat in real time, share photos and files, post 24-hour status updates and hop on audio or
            video calls with the people who matter.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 text-xs font-medium text-white/85">
            {['Realtime messaging', 'Voice & video calls', 'Status updates', 'Groups & media'].map((item) => (
              <div key={item} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2.5">
                {item}
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/60">Built with React, Tailwind CSS, Express and Socket.IO.</p>
      </aside>

      <main className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md animate-slide-up">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-app-accent text-white">
              <MessageCircleMore className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold">Chatly</span>
          </div>

          <h2 className="text-2xl font-bold text-app-text">
            {isRegister ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="mt-1 text-sm text-app-muted">
            {isRegister ? 'A few details and you are ready to chat.' : 'Sign in to pick up where you left off.'}
          </p>

          <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
            {isRegister && (
              <>
                <div>
                  <label className="label" htmlFor="name">
                    Full name
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-app-faint" />
                    <input
                      id="name"
                      className="field pl-11"
                      placeholder="Ayesha Khan"
                      value={form.name}
                      onChange={update('name')}
                      autoComplete="name"
                      required
                      minLength={2}
                    />
                  </div>
                </div>

                <div>
                  <label className="label" htmlFor="username">
                    Username
                  </label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-app-faint" />
                    <input
                      id="username"
                      className="field pl-11"
                      placeholder="ayesha"
                      value={form.username}
                      onChange={update('username')}
                      autoComplete="username"
                      required
                      minLength={3}
                    />
                  </div>
                </div>

                <div>
                  <label className="label" htmlFor="email">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-app-faint" />
                    <input
                      id="email"
                      type="email"
                      className="field pl-11"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={update('email')}
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="label" htmlFor="phone">
                    Phone <span className="normal-case text-app-faint">(optional)</span>
                  </label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-app-faint" />
                    <input
                      id="phone"
                      className="field pl-11"
                      placeholder="+92 300 0000000"
                      value={form.phone}
                      onChange={update('phone')}
                      autoComplete="tel"
                    />
                  </div>
                </div>
              </>
            )}

            {!isRegister && (
              <div>
                <label className="label" htmlFor="identifier">
                  Email, username or phone
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-app-faint" />
                  <input
                    id="identifier"
                    className="field pl-11"
                    placeholder="ayesha@example.com"
                    value={form.identifier}
                    onChange={update('identifier')}
                    autoComplete="username"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-app-faint" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="field pl-11 pr-11"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={update('password')}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  required
                  minLength={isRegister ? 8 : undefined}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-app-faint hover:text-app-text"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {isRegister && <p className="mt-1.5 text-xs text-app-faint">At least 8 characters.</p>}
            </div>

            {error && (
              <p className="rounded-xl border border-app-danger/40 bg-app-danger/10 px-4 py-2.5 text-sm text-app-danger">
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary w-full py-3" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {isRegister ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-app-muted">
            {isRegister ? 'Already have an account?' : 'New to Chatly?'}{' '}
            <Link
              to={isRegister ? '/login' : '/register'}
              className="font-semibold text-app-accent hover:underline"
            >
              {isRegister ? 'Sign in' : 'Create one'}
            </Link>
          </p>

          {!isRegister && (
            <div className="mt-6 rounded-xl border border-app-border bg-app-soft px-4 py-3 text-xs text-app-muted">
              <p className="font-semibold text-app-text">Demo accounts</p>
              <p className="mt-1">ayesha@example.com · rohan@example.com · neha@example.com · imran@example.com</p>
              <p>Password: <span className="font-medium text-app-text">password123</span></p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AuthPage;
