import { useEffect, useState } from 'react';
import { erpApi } from '../../erpApi';
import type { InstallationStats } from '../../erpTypes';
import type { Screen } from '../../layout/AppLayout';
import { Icon } from '../Icon';
import { StatCard } from '../ui';
import { stageMeta, formatDateTime } from './helpers';

export default function InstallationsDashboardWidget({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [stats, setStats] = useState<InstallationStats | null>(null);

  useEffect(() => {
    erpApi.installationStats().then(setStats).catch(() => { /* widget is non-blocking */ });
  }, []);

  if (!stats) return null;

  const activeTotal = stats.byStage.reduce((a, s) => a + s.count, 0) || 1;

  return (
    <div className="card mb-16">
      <div className="flex-between mb-16">
        <div>
          <h4 className="card-title"><Icon name="sun" size={15} /> Installations PV</h4>
          <p className="card-subtitle">Suivi de chantier en temps réel</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('erp-installations')}>Voir tout <Icon name="chevron-right" size={14} /></button>
      </div>

      <div className="grid grid-4 mb-16">
        <StatCard icon="zap" value={stats.byStatus.active} label="Actives" color="blue" />
        <StatCard icon="clock" value={stats.late} label="En retard" color="amber" />
        <StatCard icon="alert-triangle" value={stats.blocked} label="Bloquées" color="red" />
        <StatCard icon="check-circle" value={stats.byStatus.completed} label="Terminées" color="green" />
      </div>

      {/* Stage distribution */}
      <div className="inst-dash-dist">
        {stats.byStage.map((s) => s.count > 0 && (
          <span key={s.number} className="inst-dash-seg" style={{ width: `${(s.count / activeTotal) * 100}%`, background: s.color }} title={`${s.label}: ${s.count}`} />
        ))}
      </div>
      <div className="inst-dash-legend">
        {stats.byStage.filter((s) => s.count > 0).map((s) => (
          <span key={s.number} className="inst-dash-legenditem">
            <span className="inst-dash-dot" style={{ background: s.color }} /> {s.number}. {s.label} ({s.count})
          </span>
        ))}
        {activeTotal === 1 && stats.byStatus.active === 0 && <span className="form-hint">Aucune installation active.</span>}
      </div>

      {/* Recent activity */}
      {stats.recentActivities && stats.recentActivities.length > 0 && (
        <>
          <div className="form-section-title mt-16">Activité récente</div>
          <ul className="inst-dash-activity">
            {stats.recentActivities.map((a) => (
              <li key={a._id}>
                <button className="inst-dash-act" onClick={() => onNavigate('erp-installations')}>
                  <span className="inst-dash-actdot" style={{ background: stageMeta(a.currentStage || 1).color }} />
                  <span className="inst-dash-acttext">
                    <strong>{a.reference}</strong> · {a.customerName || a.title}
                    <small>{a.message || `Étape ${a.currentStage || 1} — ${stageMeta(a.currentStage || 1).label}`}{a.at ? ` · ${formatDateTime(a.at)}` : ''}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
