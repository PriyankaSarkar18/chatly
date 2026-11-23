import { NavLink } from 'react-router-dom';
import {
  CircleDashed,
  LogOut,
  MessageCircleMore,
  MessageSquare,
  Moon,
  Phone,
  Settings2,
  Sun,
  Video,
} from 'lucide-react';
import Avatar from '../ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

export const NAV_ITEMS = [
  { to: '/chat', label: 'Chats', icon: MessageSquare },
  { to: '/status', label: 'Status', icon: CircleDashed },
  { to: '/calls', label: 'Calls', icon: Phone },
  { to: '/video', label: 'Video', icon: Video },
  { to: '/settings', label: 'Settings', icon: Settings2 },
];

const NavRail = () => {
  const { user, signOut } = useAuth();
  const isDark = (document.documentElement.dataset.theme || 'dark') === 'dark';
  const toggle = () => {
    const next = isDark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('chatly.theme', next);
  };

  return (
    <>
      <nav className="hidden w-[74px] shrink-0 flex-col items-center gap-1 border-r border-app-border bg-app-panel py-4 md:flex">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-app-accent text-white shadow-lg shadow-app-accent/20">
          <MessageCircleMore className="h-6 w-6" />
        </div>

        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            title={label}
            className={({ isActive }) =>
              cn(
                'relative flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-medium transition',
                isActive
                  ? 'bg-app-accent/15 text-app-accent'
                  : 'text-app-muted hover:bg-app-hover hover:text-app-text'
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}

        <div className="mt-auto flex flex-col items-center gap-2">
          <button type="button" className="icon-btn" onClick={toggle} title="Toggle theme">
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <button type="button" className="icon-btn" onClick={() => signOut()} title="Sign out">
            <LogOut className="h-5 w-5" />
          </button>
          <NavLink to="/profile" title="My profile" className="mt-1 rounded-full ring-2 ring-transparent hover:ring-app-accent/40">
            <Avatar user={user} size="sm" />
          </NavLink>
        </div>
      </nav>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch justify-around border-t border-app-border bg-app-panel/95 backdrop-blur md:hidden">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition',
                isActive ? 'text-app-accent' : 'text-app-muted'
              )
            }
          >
            <span
              className={cn(
                'flex h-8 w-14 items-center justify-center rounded-full transition',
                ({ isActive }) => (isActive ? 'bg-app-accent/15' : '')
              )}
            >
              <Icon className="h-5 w-5" />
            </span>
            {label}
          </NavLink>
        ))}
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition',
              isActive ? 'text-app-accent' : 'text-app-muted'
            )
          }
        >
          <Avatar user={user} size="xs" className="scale-90" />
          Profile
        </NavLink>
      </nav>
    </>
  );
};

export default NavRail;
