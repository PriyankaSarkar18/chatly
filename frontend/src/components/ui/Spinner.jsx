import { cn } from '../../lib/utils';

const Spinner = ({ className = '', label }) => (
  <div className="flex items-center justify-center gap-3 text-app-muted">
    <span
      className={cn(
        'h-5 w-5 animate-spin rounded-full border-2 border-app-border border-t-app-accent',
        className
      )}
    />
    {label && <span className="text-sm">{label}</span>}
  </div>
);

export default Spinner;
