import { useEffect } from 'react';
import { Icon } from '../Icon';
import { fileUrl } from '../../api';
import type { StagePhoto } from '../../erpTypes';
import { formatDateTime, personName } from './helpers';

export default function Lightbox({
  photos, index, onClose, onNav, onDelete, canDelete,
}: {
  photos: StagePhoto[];
  index: number;
  onClose: () => void;
  onNav: (delta: number) => void;
  onDelete?: (photoId: string) => void;
  canDelete?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') onNav(-1);
      else if (e.key === 'ArrowRight') onNav(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onNav]);

  if (index < 0 || !photos[index]) return null;
  const photo = photos[index];
  const src = fileUrl(photo.thumbnailUrl || photo.url);

  return (
    <div className="inst-lightbox" onClick={onClose}>
      <div className="inst-lightbox-inner" onClick={(e) => e.stopPropagation()}>
        <div className="inst-lightbox-top">
          <span className="inst-lightbox-count">{index + 1} / {photos.length}</span>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer"><Icon name="x" size={16} /></button>
        </div>

        <div className="inst-lightbox-stage">
          {index > 0 && (
            <button className="inst-lightbox-nav prev" onClick={() => onNav(-1)} aria-label="Précédent"><Icon name="chevron-left" size={22} /></button>
          )}
          <img src={src} alt={photo.caption || 'Photo de vérification'} />
          {index < photos.length - 1 && (
            <button className="inst-lightbox-nav next" onClick={() => onNav(1)} aria-label="Suivant"><Icon name="chevron-right" size={22} /></button>
          )}
        </div>

        <div className="inst-lightbox-bottom">
          <div className="inst-lightbox-meta">
            {photo.caption && <div className="inst-lightbox-caption">{photo.caption}</div>}
            <div className="inst-lightbox-sub">
              {personName(photo.uploadedBy)} · {formatDateTime(photo.takenAt)}
              {photo.location?.lat != null && photo.location?.lng != null && (
                <span> · GPS {photo.location.lat.toFixed(5)}, {photo.location.lng.toFixed(5)}</span>
              )}
            </div>
          </div>
          {canDelete && onDelete && (
            <button className="btn btn-danger btn-sm" onClick={() => onDelete(photo._id)}>
              <Icon name="x" size={14} /> Supprimer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
