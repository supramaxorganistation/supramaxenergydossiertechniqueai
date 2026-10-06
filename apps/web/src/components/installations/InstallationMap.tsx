import type { InstallationMapPoint } from '../../erpTypes';
import { stageMeta } from './helpers';
import { EmptyState } from '../ui';

// Schematic map: projects GPS points onto Tunisia's bounding box (no map lib).
const MIN_LNG = 7.4, MAX_LNG = 11.7, MIN_LAT = 30.0, MAX_LAT = 37.8;
const W = 100, H = 180;

function project(lng: number, lat: number) {
  const x = ((lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * W;
  const y = ((MAX_LAT - lat) / (MAX_LAT - MIN_LAT)) * H;
  return { x: Math.max(2, Math.min(W - 2, x)), y: Math.max(2, Math.min(H - 2, y)) };
}

export default function InstallationMap({
  points, onOpen,
}: {
  points: InstallationMapPoint[];
  onOpen: (id: string) => void;
}) {
  if (!points || points.length === 0) {
    return <EmptyState icon="search" title="Aucun point géolocalisé" subtitle="Ajoutez des coordonnées GPS aux installations pour les afficher ici." />;
  }

  return (
    <div className="inst-map-layout">
      <div className="inst-map-frame">
        <svg viewBox={`0 0 ${W} ${H}`} className="inst-map" role="img" aria-label="Carte des installations">
          <rect x="0" y="0" width={W} height={H} className="inst-map-bg" />
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={`v${f}`} x1={W * f} y1="0" x2={W * f} y2={H} className="inst-map-grid" />
          ))}
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={`h${f}`} x1="0" y1={H * f} x2={W} y2={H * f} className="inst-map-grid" />
          ))}
          {points.map((p) => {
            const [lng, lat] = p.coordinates;
            const { x, y } = project(lng, lat);
            const color = p.status === 'completed' ? 'var(--success)' : p.isBlocked ? 'var(--danger)' : stageMeta(p.currentStage || 1).color;
            return (
              <g key={p._id} className="inst-map-pin" onClick={() => onOpen(p._id)} transform={`translate(${x} ${y})`}>
                <title>{`${p.reference || ''} — ${p.customerName || p.title || ''}`}</title>
                <circle r="3.4" fill={color} stroke="#fff" strokeWidth="0.9" />
                {p.isBlocked && <circle r="5.4" fill="none" stroke="var(--danger)" strokeWidth="0.8" />}
              </g>
            );
          })}
        </svg>
        <span className="inst-map-note">Position relative — Tunisie</span>
      </div>

      <ul className="inst-map-list">
        {points.map((p) => (
          <li key={p._id}>
            <button className="inst-map-listitem" onClick={() => onOpen(p._id)}>
              <span className="inst-map-dot" style={{ background: p.status === 'completed' ? 'var(--success)' : p.isBlocked ? 'var(--danger)' : stageMeta(p.currentStage || 1).color }} />
              <span className="inst-map-listtext">
                <strong>{p.customerName || p.title || p.reference}</strong>
                <small>{[p.city, p.governorate].filter(Boolean).join(' · ')} — Étape {p.currentStage || 1}{p.isBlocked ? ' · Bloquée' : ''}</small>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
