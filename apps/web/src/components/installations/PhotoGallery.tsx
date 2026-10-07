import { Icon } from '../Icon';
import { fileUrl } from '../../api';
import type { StagePhoto } from '../../erpTypes';
import { EmptyState } from '../ui';

export default function PhotoGallery({
  photos, onOpen, onDelete, canDelete,
}: {
  photos: StagePhoto[];
  onOpen: (index: number) => void;
  onDelete?: (photoId: string) => void;
  canDelete?: boolean;
}) {
  if (!photos || photos.length === 0) {
    return <EmptyState icon="camera" title="Aucune photo" subtitle="Ajoutez des photos de vérification pour cette étape." />;
  }
  return (
    <div className="inst-gallery">
      {photos.map((p, i) => (
        <figure key={p._id} className="inst-thumb" onClick={() => onOpen(i)}>
          <img src={fileUrl(p.thumbnailUrl || p.url)} alt={p.caption || 'Photo'} loading="lazy" />
          {p.caption && <figcaption className="inst-thumb-caption">{p.caption}</figcaption>}
          {canDelete && onDelete && (
            <button
              className="inst-thumb-del"
              aria-label="Supprimer la photo"
              onClick={(e) => { e.stopPropagation(); onDelete(p._id); }}
            >
              <Icon name="x" size={13} />
            </button>
          )}
        </figure>
      ))}
    </div>
  );
}
