import { useMemo, useState } from 'react';
import type { Dossier, DossierStatus, User } from '../types';
import { StatusBadge } from '../components/ui';
import { EmptyState } from '../components/ui';

const STATUS_FILTERS: { key: DossierStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'Tous' },
  { key: 'DRAFT', label: 'Brouillon' },
  { key: 'PENDING_APPROVAL', label: 'En attente' },
  { key: 'APPROVED', label: 'Approuvé' },
  { key: 'REJECTED', label: 'Rejeté' },
];

export default function DossiersPage({
  dossiers,
  currentUser,
  onOpenDossier,
  onNewDossier,
  onDeleteDossier,
}: {
  dossiers: Dossier[];
  currentUser: User;
  onOpenDossier: (d: Dossier) => void;
  onNewDossier: () => void;
  onDeleteDossier: (d: Dossier) => void;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DossierStatus | 'ALL'>('ALL');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return dossiers.filter((d) => {
      if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;
      if (!q) return true;
      return (
        d.customerDetails.name.toLowerCase().includes(q) ||
        d.customerDetails.cin.toLowerCase().includes(q) ||
        d.pvSystemParams.inverterModel.toLowerCase().includes(q) ||
        d.customerDetails.stegMeterRef.toLowerCase().includes(q)
      );
    });
  }, [dossiers, search, statusFilter]);

  const canCreate = currentUser.role === 'admin' || currentUser.role === 'technician';

  return (
    <>
      <div className="flex-between mb-16">
        <div className="search-input" style={{ flex: 1, maxWidth: 380 }}>
          <input
            className="input"
            placeholder="Rechercher par client, CIN, onduleur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-8">
          <select
            className="select"
            style={{ width: 170 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DossierStatus | 'ALL')}
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
          {canCreate && (
            <button className="btn btn-primary" onClick={onNewDossier}>
              + Nouveau dossier
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="🗂️"
            title={search || statusFilter !== 'ALL' ? 'Aucun résultat' : 'Aucun dossier'}
            subtitle={
              search || statusFilter !== 'ALL'
                ? 'Essayez d’affiner vos critères de recherche.'
                : 'Créez votre premier dossier technique pour commencer.'
            }
          />
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Client</th>
                <th>CIN</th>
                <th>Puissance</th>
                <th>Onduleur</th>
                <th>Statut</th>
                <th>Créé le</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d._id}>
                  <td>
                    <strong>{d.customerDetails.name}</strong>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {d.customerDetails.phone || d.customerDetails.address}
                    </div>
                  </td>
                  <td>{d.customerDetails.cin}</td>
                  <td>{d.pvSystemParams.peakPowerKwc} kWc</td>
                  <td>{d.pvSystemParams.inverterModel}</td>
                  <td><StatusBadge status={d.status} /></td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {new Date(d.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td>
                    <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn btn-sm btn-ghost" onClick={() => onOpenDossier(d)}>
                        Ouvrir
                      </button>
                      {currentUser.role === 'admin' && (
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => {
                            if (window.confirm(`Supprimer le dossier de ${d.customerDetails.name} ?`)) {
                              onDeleteDossier(d);
                            }
                          }}
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
