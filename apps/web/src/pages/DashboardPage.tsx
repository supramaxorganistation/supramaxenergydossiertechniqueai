import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { Dossier } from '../types';
import { StatCard, EmptyState } from '../components/ui';
import type { Screen } from '../layout/AppLayout';

const COLORS = ['#2563eb', '#f59e0b', '#059669', '#dc2626'];
const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

export default function DashboardPage({
  dossiers,
  userName,
  role,
  onNavigate,
}: {
  dossiers: Dossier[];
  userName: string;
  role: string;
  onNavigate: (s: Screen) => void;
}) {
  const totalPower = useMemo(
    () => dossiers.reduce((sum, d) => sum + (d.pvSystemParams.peakPowerKwc || 0), 0),
    [dossiers]
  );
  const pending = dossiers.filter((d) => d.status === 'PENDING_APPROVAL').length;
  const approved = dossiers.filter((d) => d.status === 'APPROVED').length;

  const statusData = useMemo(() => {
    const counts: Record<string, number> = { DRAFT: 0, PENDING_APPROVAL: 0, APPROVED: 0, REJECTED: 0 };
    dossiers.forEach((d) => {
      counts[d.status] = (counts[d.status] || 0) + 1;
    });
    return [
      { name: 'DRAFT', label: 'Brouillon', value: counts.DRAFT },
      { name: 'PENDING_APPROVAL', label: 'En attente', value: counts.PENDING_APPROVAL },
      { name: 'APPROVED', label: 'Approuvé', value: counts.APPROVED },
      { name: 'REJECTED', label: 'Rejeté', value: counts.REJECTED },
    ].filter((s) => s.value > 0);
  }, [dossiers]);

  const monthlyYield = useMemo(() => {
    const buckets = Array.from({ length: 12 }, (_, i) => ({ month: MONTHS[i], yield: 0, count: 0 }));
    dossiers.forEach((d) => {
      const date = new Date(d.createdAt);
      const m = date.getMonth();
      buckets[m].yield += d.calculations?.estimatedAnnualYieldKwh || 0;
      buckets[m].count += 1;
    });
    return buckets.filter((b) => b.count > 0);
  }, [dossiers]);

  const roleLabel =
    role === 'admin' ? 'Administrateur' : role === 'technician' ? 'Technicien' : 'Client';

  return (
    <>
      <div className="grid grid-4 mb-16">
        <StatCard icon="📁" value={dossiers.length} label="Total dossiers" color="blue" />
        <StatCard icon="🔆" value={`${totalPower.toFixed(1)} kWc`} label="Puissance installée" color="amber" />
        <StatCard icon="⏳" value={pending} label="En attente d'approbation" color="red" />
        <StatCard icon="✅" value={approved} label="Approuvés" color="green" />
      </div>

      {dossiers.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="🗂️"
            title="Aucun dossier pour le moment"
            subtitle="Créez votre premier dossier technique pour commencer."
          />
          <div style={{ textAlign: 'center' }}>
            <button className="btn btn-primary" onClick={() => onNavigate('dossier-create')}>
              + Nouveau dossier
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-2">
          <div className="card">
            <h4 className="card-title">Répartition des statuts</h4>
            <p className="card-subtitle">État des dossiers techniques</p>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ label, value }: any) => `${label}: ${value}`}
                  outerRadius={90}
                  dataKey="value"
                >
                  {statusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h4 className="card-title">Production annuelle estimée (kWh)</h4>
            <p className="card-subtitle">Par mois de création des dossiers</p>
            {monthlyYield.length === 0 ? (
              <EmptyState icon="📈" title="Pas encore de données" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyYield}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="yield" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      <div className="card mt-16">
        <h4 className="card-title">Bonjour, {userName} 👋</h4>
        <p className="card-subtitle">
          Vous êtes connecté en tant que <strong>{roleLabel}</strong>.
          {role !== 'client'
            ? ' Gérez les dossiers techniques, vérifiez la conformité STEG et générez les PDF.'
            : ' Suivez l’état d’avancement de vos dossiers.'}
        </p>
        <div className="flex gap-8">
          <button className="btn btn-primary" onClick={() => onNavigate('dossiers')}>
            Voir les dossiers
          </button>
          {role !== 'client' && (
            <button className="btn btn-ghost" onClick={() => onNavigate('dossier-create')}>
              + Nouveau dossier
            </button>
          )}
        </div>
      </div>
    </>
  );
}
