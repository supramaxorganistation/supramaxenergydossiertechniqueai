import { useCallback, useEffect, useState } from 'react';
import { erpApi } from '../erpApi';
import {
  INSTALLATION_STAGES,
  type ErpCustomer, type ErpEmployee, type ErpInstallation, type ErpQuote,
  type InstallationMapPoint, type InstallationStats, type InstallationStatus, type SystemType,
} from '../erpTypes';
import type { User } from '../types';
import { Icon } from '../components/Icon';
import { Badge, EmptyState, LoadingScreen, StatCard } from '../components/ui';
import Modal from '../components/installations/Modal';
import ProgressBar from '../components/installations/ProgressBar';
import InstallationMap from '../components/installations/InstallationMap';
import KanbanBoard from '../components/installations/KanbanBoard';
import ChecklistConfig from '../components/installations/ChecklistConfig';
import {
  INSTALLATION_STATUS_META, SYSTEM_TYPE_LABEL,
  formatDate, isLate, personName, stageMeta,
} from '../components/installations/helpers';

type View = 'list' | 'kanban' | 'map' | 'config';
type Filters = { q: string; status: string; stage: string; governorate: string; technicianId: string; blocked: boolean; late: boolean };

const EMPTY_FILTERS: Filters = { q: '', status: '', stage: '', governorate: '', technicianId: '', blocked: false, late: false };
const SYSTEM_OPTIONS: { value: SystemType; label: string }[] = [
  { value: 'on_grid', label: SYSTEM_TYPE_LABEL.on_grid },
  { value: 'hybrid', label: SYSTEM_TYPE_LABEL.hybrid },
  { value: 'off_grid', label: SYSTEM_TYPE_LABEL.off_grid },
];

export default function InstallationsPage({
  currentUser, onOpenInstallation,
}: {
  currentUser: User;
  onOpenInstallation: (id: string) => void;
}) {
  const [view, setView] = useState<View>('list');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ErpInstallation[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [kanban, setKanban] = useState<ErpInstallation[]>([]);
  const [mapPoints, setMapPoints] = useState<InstallationMapPoint[]>([]);
  const [stats, setStats] = useState<InstallationStats | null>(null);

  const [customers, setCustomers] = useState<ErpCustomer[]>([]);
  const [employees, setEmployees] = useState<ErpEmployee[]>([]);
  const [quotes, setQuotes] = useState<ErpQuote[]>([]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [alertsDismissed, setAlertsDismissed] = useState(false);
  const [createModal, setCreateModal] = useState<null | 'manual' | 'quote'>(null);
  const [quoteId, setQuoteId] = useState('');
  const [form, setForm] = useState<Record<string, string>>({ systemType: 'on_grid' });

  const isAdmin = currentUser.role === 'admin';
  const canCreate = isAdmin || currentUser.role === 'technician';

  const loadStats = useCallback(async () => {
    try { setStats(await erpApi.installationStats()); } catch { /* ignore */ }
  }, []);

  const loadView = useCallback(async () => {
    if (view === 'config') { setLoading(false); return; }
    setLoading(true);
    try {
      if (view === 'list') {
        const res = await erpApi.listInstallations({
          q: filters.q || undefined,
          status: (filters.status || undefined) as InstallationStatus | undefined,
          stage: filters.stage ? Number(filters.stage) : undefined,
          governorate: filters.governorate || undefined,
          technicianId: filters.technicianId || undefined,
          blocked: filters.blocked || undefined,
          late: filters.late || undefined,
          page, limit: 20,
        });
        setItems(res.items); setTotal(res.total); setPages(res.pages);
      } else if (view === 'kanban') {
        const res = await erpApi.listInstallations({ status: 'active', limit: 100 });
        setKanban(res.items);
      } else {
        setMapPoints(await erpApi.installationMap());
      }
    } catch (err) {
      setNotice(`Erreur : ${err instanceof Error ? err.message : 'chargement impossible'}`);
    } finally {
      setLoading(false);
    }
  }, [view, filters, page]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadView(); }, [loadView]);
  useEffect(() => {
    (async () => {
      try {
        const [c, e, q] = await Promise.all([erpApi.listCustomers(), erpApi.listEmployees(), erpApi.listQuotes()]);
        setCustomers(c); setEmployees(e); setQuotes(q);
      } catch { /* ignore */ }
    })();
  }, []);

  const refresh = async () => { await Promise.all([loadView(), loadStats()]); };

  const updateFilter = (patch: Partial<Filters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };

  const submitManual = async () => {
    if (!form.customerId || !form.title) { setNotice('Client et titre sont obligatoires.'); return; }
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        customerId: form.customerId, title: form.title, systemType: form.systemType,
        address: form.address || undefined, city: form.city || undefined, governorate: form.governorate || undefined,
        technicianId: form.technicianId || undefined, startDate: form.startDate || undefined, targetEndDate: form.targetEndDate || undefined,
      };
      if (form.powerKwc) payload.powerKwc = Number(form.powerKwc);
      if (form.lat && form.lng) { payload.lat = Number(form.lat); payload.lng = Number(form.lng); }
      const created = await erpApi.createInstallation(payload as Partial<ErpInstallation> & { lat?: number; lng?: number });
      setCreateModal(null); setForm({ systemType: 'on_grid' });
      await refresh();
      setNotice(`Installation ${created.reference || ''} créée.`);
    } catch (err) {
      setNotice(`Erreur : ${err instanceof Error ? err.message : 'création impossible'}`);
    } finally { setBusy(false); }
  };

  const submitFromQuote = async () => {
    if (!quoteId) { setNotice('Sélectionnez un devis.'); return; }
    setBusy(true);
    try {
      const created = await erpApi.createInstallationFromQuote(quoteId);
      setCreateModal(null); setQuoteId('');
      await refresh();
      setNotice(`Installation ${created.reference || ''} créée depuis le devis.`);
    } catch (err) {
      setNotice(`Erreur : ${err instanceof Error ? err.message : 'création impossible'}`);
    } finally { setBusy(false); }
  };

  return (
    <>
      {/* Header */}
      <div className="flex-between mb-16">
        <h3 style={{ fontSize: 15, fontWeight: 700 }}>Installations — suivi de chantier PV</h3>
        {canCreate && (
          <div className="flex gap-8">
            <button className="btn btn-ghost btn-sm" onClick={() => setCreateModal('quote')}><Icon name="file-text" size={14} /> Depuis un devis</button>
            <button className="btn btn-primary btn-sm" onClick={() => setCreateModal('manual')}><Icon name="plus-circle" size={14} /> Nouvelle installation</button>
          </div>
        )}
      </div>

      {notice && (
        <div className="msg-box info mb-16" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{notice}</span>
          <button className="icon-btn" onClick={() => setNotice('')} aria-label="Fermer"><Icon name="x" size={13} /></button>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-4 mb-16">
          <StatCard icon="building" value={stats.total} label="Total installations" color="blue" />
          <StatCard icon="zap" value={stats.byStatus.active} label="Actives" color="green" />
          <StatCard icon="clock" value={stats.late} label="En retard" color="amber" />
          <StatCard icon="alert-triangle" value={stats.blocked} label="Bloquées" color="red" />
        </div>
      )}

      {stats && !alertsDismissed && (stats.blocked > 0 || stats.late > 0) && (
        <div className="msg-box warn mb-16 inst-alerts">
          <Icon name="alert-triangle" size={15} />
          <span className="inst-alerts-text">
            {stats.blocked > 0 && (
              <button className="inst-alert-link" onClick={() => { setView('list'); updateFilter({ blocked: true }); }}>
                {stats.blocked} installation(s) bloquée(s)
              </button>
            )}
            {stats.blocked > 0 && stats.late > 0 && ' · '}
            {stats.late > 0 && (
              <button className="inst-alert-link" onClick={() => { setView('list'); updateFilter({ late: true }); }}>
                {stats.late} en retard
              </button>
            )}
            {' — cliquez pour filtrer.'}
          </span>
          <button className="icon-btn" onClick={() => setAlertsDismissed(true)} aria-label="Fermer"><Icon name="x" size={13} /></button>
        </div>
      )}

      {/* View switcher */}
      <div className="tabs mb-16">
        <button className={`tab ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>Liste</button>
        <button className={`tab ${view === 'kanban' ? 'active' : ''}`} onClick={() => setView('kanban')}>Kanban</button>
        <button className={`tab ${view === 'map' ? 'active' : ''}`} onClick={() => setView('map')}>Carte</button>
        {isAdmin && <button className={`tab ${view === 'config' ? 'active' : ''}`} onClick={() => setView('config')}><Icon name="settings" size={14} /> Configuration</button>}
      </div>

      {/* Filters (list view) */}
      {view === 'list' && (
        <div className="card mb-16">
          <div className="inst-filters">
            <div className="inst-filter grow">
              <label className="form-label">Recherche</label>
              <input className="input" placeholder="Référence, client, titre, ville…" value={filters.q} onChange={(e) => updateFilter({ q: e.target.value })} />
            </div>
            <div className="inst-filter">
              <label className="form-label">Statut</label>
              <select className="select" value={filters.status} onChange={(e) => updateFilter({ status: e.target.value })}>
                <option value="">Tous</option>
                <option value="active">Active</option>
                <option value="completed">Terminée</option>
                <option value="cancelled">Annulée</option>
              </select>
            </div>
            <div className="inst-filter">
              <label className="form-label">Étape</label>
              <select className="select" value={filters.stage} onChange={(e) => updateFilter({ stage: e.target.value })}>
                <option value="">Toutes</option>
                {INSTALLATION_STAGES.map((s) => <option key={s.number} value={s.number}>{s.number}. {s.label}</option>)}
              </select>
            </div>
            <div className="inst-filter">
              <label className="form-label">Technicien</label>
              <select className="select" value={filters.technicianId} onChange={(e) => updateFilter({ technicianId: e.target.value })}>
                <option value="">Tous</option>
                {employees.map((emp) => <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>)}
              </select>
            </div>
            <div className="inst-filter">
              <label className="form-label">Gouvernorat</label>
              <input className="input" value={filters.governorate} onChange={(e) => updateFilter({ governorate: e.target.value })} />
            </div>
            <div className="inst-filter inst-filter-checks">
              <label className="inst-check"><input type="checkbox" checked={filters.blocked} onChange={(e) => updateFilter({ blocked: e.target.checked })} /> Bloquées</label>
              <label className="inst-check"><input type="checkbox" checked={filters.late} onChange={(e) => updateFilter({ late: e.target.checked })} /> En retard</label>
              <button className="btn btn-ghost btn-sm" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }}>Réinitialiser</button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? <LoadingScreen label="Chargement…" /> : (
        <>
          {view === 'list' && (
            items.length === 0 ? (
              <EmptyState icon="inbox" title="Aucune installation" subtitle="Ajustez les filtres ou créez une nouvelle installation." />
            ) : (
              <>
                <div className="table-wrap">
                  <table className="data">
                    <thead>
                      <tr><th>Référence</th><th>Client</th><th>Titre</th><th>Étape</th><th>Progression</th><th>Statut</th><th>Technicien</th><th>Date cible</th><th></th></tr>
                    </thead>
                    <tbody>
                      {items.map((inst) => {
                        const st = INSTALLATION_STATUS_META[inst.status || 'active'];
                        const late = isLate(inst.targetEndDate, inst.status);
                        return (
                          <tr key={inst._id} className="inst-row" onClick={() => onOpenInstallation(inst._id)}>
                            <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{inst.reference}</td>
                            <td>{inst.customerName || '—'}</td>
                            <td>{inst.title}</td>
                            <td>
                              <span className="inst-stagecell">
                                <span className="inst-stagecell-dot" style={{ background: stageMeta(inst.currentStage || 1).color }} />
                                {inst.currentStage || 1}/10 · {stageMeta(inst.currentStage || 1).label}
                              </span>
                            </td>
                            <td style={{ minWidth: 110 }}><ProgressBar value={inst.progress || 0} height={6} /></td>
                            <td>
                              <span className={`badge badge-${st.badge}`}><span className="badge-dot" />{st.label}</span>
                              {inst.isBlocked && <Badge color="amber">Bloquée</Badge>}
                            </td>
                            <td>{personName(inst.technicianId)}</td>
                            <td>{formatDate(inst.targetEndDate)} {late && <Badge color="red">Retard</Badge>}</td>
                            <td><button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); onOpenInstallation(inst._id); }}>Ouvrir</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="inst-pagination">
                  <span>{total} installation(s) · page {page}/{pages}</span>
                  <div className="flex gap-8">
                    <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Précédent</button>
                    <button className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Suivant</button>
                  </div>
                </div>
              </>
            )
          )}

          {view === 'kanban' && (
            <div className="card">
              {kanban.length === 0
                ? <EmptyState icon="inbox" title="Aucune installation active" />
                : <KanbanBoard installations={kanban} onOpen={onOpenInstallation} />}
            </div>
          )}

          {view === 'map' && (
            <div className="card">
              <InstallationMap points={mapPoints} onOpen={onOpenInstallation} />
            </div>
          )}

          {view === 'config' && isAdmin && (
            <div className="card">
              <h4 className="card-title"><Icon name="settings" size={15} /> Checklists de vérification par étape</h4>
              <ChecklistConfig />
            </div>
          )}
        </>
      )}

      {/* Create (manual) */}
      <Modal
        open={createModal === 'manual'}
        title="Nouvelle installation"
        width={640}
        onClose={() => setCreateModal(null)}
        footer={
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => setCreateModal(null)}>Annuler</button>
            <button className="btn btn-primary btn-sm" onClick={submitManual} disabled={busy || !form.customerId || !form.title}>Créer</button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Client *</label>
            <select className="select" value={form.customerId || ''} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
              <option value="">Sélectionner…</option>
              {customers.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Titre *</label>
            <input className="input" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex. Toiture 30 kWc" />
          </div>
          <div className="form-group">
            <label className="form-label">Puissance (kWc)</label>
            <input className="input" type="number" min="0" step="0.1" value={form.powerKwc || ''} onChange={(e) => setForm({ ...form, powerKwc: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Type de système</label>
            <select className="select" value={form.systemType} onChange={(e) => setForm({ ...form, systemType: e.target.value })}>
              {SYSTEM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Technicien</label>
            <select className="select" value={form.technicianId || ''} onChange={(e) => setForm({ ...form, technicianId: e.target.value })}>
              <option value="">— Aucun —</option>
              {employees.map((emp) => <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Gouvernorat</label>
            <input className="input" value={form.governorate || ''} onChange={(e) => setForm({ ...form, governorate: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Ville</label>
            <input className="input" value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Adresse</label>
            <input className="input" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Date de début</label>
            <input className="input" type="date" value={form.startDate || ''} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Date cible</label>
            <input className="input" type="date" value={form.targetEndDate || ''} onChange={(e) => setForm({ ...form, targetEndDate: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Latitude</label>
            <input className="input" type="number" step="0.00001" value={form.lat || ''} onChange={(e) => setForm({ ...form, lat: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Longitude</label>
            <input className="input" type="number" step="0.00001" value={form.lng || ''} onChange={(e) => setForm({ ...form, lng: e.target.value })} />
          </div>
        </div>
        <p className="form-hint">Les coordonnées GPS alimentent la carte. La checklist des 10 étapes est initialisée automatiquement.</p>
      </Modal>

      {/* Create from quote */}
      <Modal
        open={createModal === 'quote'}
        title="Créer depuis un devis"
        onClose={() => setCreateModal(null)}
        footer={
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => setCreateModal(null)}>Annuler</button>
            <button className="btn btn-primary btn-sm" onClick={submitFromQuote} disabled={busy || !quoteId}>Créer</button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Devis</label>
          <select className="select" value={quoteId} onChange={(e) => setQuoteId(e.target.value)}>
            <option value="">Sélectionner…</option>
            {quotes.map((q) => (
              <option key={q._id} value={q._id}>
                {q.quoteNumber} — {typeof q.customer === 'object' && q.customer ? q.customer.name : (q.customerName || 'Client')} ({q.status})
              </option>
            ))}
          </select>
          <p className="form-hint">Les étapes 1–2 sont pré-alignées sur le statut du devis.</p>
        </div>
      </Modal>
    </>
  );
}
