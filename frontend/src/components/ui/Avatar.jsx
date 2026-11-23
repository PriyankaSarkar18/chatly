import { Users } from 'lucide-react';
import { assetUrl } from '../../lib/api';
import { avatarGradient, cn, initials } from '../../lib/utils';

const SIZES = {
  xs: 'h-8 w-8 text-[11px]',
  sm: 'h-10 w-10 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-28 w-28 text-2xl',
};

const Avatar = ({ user, name, avatarUrl, size = 'md', online = false, group = false, className = '' }) => {
  const label = name || user?.name || '';
  const src = avatarUrl ?? user?.avatarUrl;
  const isOnline = online && Boolean(user?.isOnline);

  return (
    <div className={cn('relative shrink-0', className)}>
      {src ? (
        <img
          src={assetUrl(src)}
          alt={label}
          loading="lazy"
          className={cn('rounded-full object-cover', SIZES[size])}
        />
      ) : (
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white',
            avatarGradient(label || 'chat'),
            SIZES[size]
          )}
        >
          {group ? <Users className="h-1/2 w-1/2" /> : initials(label)}
        </div>
      )}

      {isOnline && (
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-app-panel bg-emerald-400" />
      )}
    </div>
  );
};

export default Avatar;
