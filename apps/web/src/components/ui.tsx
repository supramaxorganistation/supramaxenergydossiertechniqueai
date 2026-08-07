import type { DossierStatus } from '../types';

const STATUS_META: Record<DossierStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Brouillon', className: 'badge-gray' },
  PENDING_APPROVAL: { label: 'En attente', className: 'badge-amber' },
  APPROVED: { label: 'Approuvé', className: 'badge-green' },
  REJECTED: { label: 'Rejeté', className: 'badge-red' },
};

export function StatusBadge({ status }: { status: DossierStatus }) {
  const meta = STATUS_META[status] || STATUS_META.DRAFT;
  return (
    <span className={`badge ${meta.className}`}>
      <span className="badge-dot" />
      {meta.label}
    </span>
  );
}

export function Badge({
  color = 'gray',
  children,
}: {
  color?: 'gray' | 'amber' | 'green' | 'red' | 'blue';
  children: React.ReactNode;
}) {
  return <span className={`badge badge-${color}`}>{children}</span>;
}

export function StatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: string;
  value: React.ReactNode;
  label: string;
  color: 'blue' | 'green' | 'amber' | 'red';
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon stat-${color}`}>{icon}</div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

export function EmptyState({
  icon = '📭',
  title,
  subtitle,
}: {
  icon?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
}

export function LoadingScreen({ label = 'Chargement...' }: { label?: string }) {
  return (
    <div className="loading-screen">
      <span className="spinner" />
      {label}
    </div>
  );
}
