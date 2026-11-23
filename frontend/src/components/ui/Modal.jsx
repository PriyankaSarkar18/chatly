import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

const Modal = ({ open, onClose, title, description, children, footer, size = 'md' }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <button type="button" aria-label="Close" className="absolute inset-0 cursor-default" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-10 w-full animate-slide-up overflow-hidden rounded-t-2xl border border-app-border bg-app-panel shadow-pop sm:rounded-2xl',
          size === 'md' ? 'sm:max-w-md' : 'sm:max-w-lg'
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-app-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-app-text">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-app-muted">{description}</p>}
          </div>
          <button type="button" className="icon-btn -mr-1 h-8 w-8" onClick={onClose} aria-label="Close dialog">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>

        {footer && <div className="flex justify-end gap-2 border-t border-app-border px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;
