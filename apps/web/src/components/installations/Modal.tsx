import { useEffect, type ReactNode } from 'react';
import { Icon } from '../Icon';

/** Lightweight modal used for edit / assign / block / cancel dialogs. */
export default function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  width = 520,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="inst-modal-overlay" onClick={onClose}>
      <div className="inst-modal" style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()}>
        <div className="inst-modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} title="Fermer" aria-label="Fermer">
            <Icon name="x" size={16} />
          </button>
        </div>
        <div className="inst-modal-body">{children}</div>
        {footer && <div className="inst-modal-foot">{footer}</div>}
      </div>
    </div>
  );
}
