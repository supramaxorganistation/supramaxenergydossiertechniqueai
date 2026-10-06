import { useCallback, useEffect, useState } from 'react';
import { erpApi } from '../erpApi';
import type { ChecklistItemType, ErpEmployee, ErpInstallation, InstallationEvent, InstallationStage, SystemType } from '../erpTypes';
import type { User } from '../types';
import { Icon } from '../components/Icon';
import { Badge, EmptyState, LoadingScreen } from '../components/ui';
import StageTimeline from '../components/installations/StageTimeline';
import EventLog from '../components/installations/EventLog';
import ProgressBar from '../components/installations/ProgressBar';
import Modal from '../components/installations/Modal';
import PhotoUploader from '../components/installations/PhotoUploader';
import PhotoGallery from '../components/installations/PhotoGallery';
import Lightbox from '../components/installations/Lightbox';
import DocumentPanel from '../components/installations/DocumentPanel';
import {
  INSTALLATION_STATUS_META, SYSTEM_TYPE_LABEL, canEditStage,
  formatDate, isLate, personName, stageMeta,
} from '../components/installations/helpers';

type Tab = 'timeline' | 'photos' | 'documents' | 'history';

type ModalState =
  | { kind: 'block'; stage: number }
  | { kind: 'override'; stage: number }
  | { kind: 'cancel' }
  | { kind: 'edit' }
  | { kind: 'assign' }
  | null;

function kv(label: string, value: React.ReactNode) {
  return (
    <div className="kv-item">
      <span className="k">{label}</span>
      <span className="v">{value}</span>
    </div>
  );
}

const SYSTEM_OPTIONS: { value: SystemType; label: string }[] = [
  { value: 'on_grid', label: SYSTEM_TYPE_LABEL.on_grid },
  { value: 'hybrid', label: SYSTEM_TYPE_LABEL.hybrid },
  { value: 'off_grid', label: SYSTEM_TYPE_LABEL.off_grid },
];

/** Horizontal stage selector used by the Photos & Documents tabs. */
function StagePicker({
  stages, value, onChange, mode,
}: {
  stages: InstallationStage[];
  value: number;
  onChange: (n: number) => void;
  mode: 'photo' | 'document';
}) {
  return (
    <div className="inst-stage-picker">
      {stages.map((s) => {
        const count = mode === 'photo' ? (s.photos?.length || 0) : (s.documents?.length || 0);
        return (
          <button
            key={s.stageNumber}
            className={`inst-picker-chip ${value === s.stageNumber ? 'active' : ''}`}
            onClick={() => onChange(s.stageNumber)}
            title={stageMeta(s.stageNumber).label}
          >
            <span className="inst-picker-num">{s.stageNumber}</span>
            {count > 0 && <span className="inst-picker-count">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export default function InstallationDetailPage({
  installationId,
  currentUser,
  onBack,
}: {
  installationId: string;
  currentUser: User;
  onBack: () => void;
}) {
  const [installation, setInstallation] = useState<ErpInstallation | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState<Tab>('timeline');

  const [modal, setModal] = useState<ModalState>(null);
  const [reason, setReason] = useState('');
  const [employees, setEmployees] = useState<ErpEmployee[]>([]);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [form, setForm] = useState<Record<string, string>>({});
  const [selectedStage, setSelectedStage] = useState(0); // 0 = not yet initialized
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  const isAdmin = currentUser.role === 'admin';

  const load = useCallback(async () => {
    try {
      const data = await erpApi.getInstallation(installationId);
      setInstallation(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [installationId]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  // Select the current stage once, the first time the installation is loaded.
  useEffect(() => {
    if (installation && selectedStage === 0) setSelectedStage(installation.currentStage || 1);
  }, [installation, selectedStage]);

  const runAction = useCallback(async (fn: () => Promise<unknown>, okMsg?: string) => {
    setBusy(true);
    setNotice('');
    try {
      await fn();
      await load();
      if (okMsg) setNotice(okMsg);
    } catch (err) {
      setNotice(`Erreur : ${err instanceof Error ? err.message : 'opération impossible'}`);
    } finally {
      setBusy(false);
    }
  }, [load]);

  // ---- stage handlers ----
  const handleStart = (n: number) => runAction(() => erpApi.startStage(installationId, n));
  const handleUnblock = (n: number) => runAction(() => erpApi.unblockStage(installationId, n), 'Étape débloquée.');
  const handleComplete = (n: number, opts: { adminOverride?: boolean }) => {
    if (opts.adminOverride) { setReason(''); setModal({ kind: 'override', stage: n }); return; }
    runAction(() => erpApi.completeStage(installationId, n, {}), 'Étape validée.');
  };
  const handleBlock = (n: number) => { setReason(''); setModal({ kind: 'block', stage: n }); };
  const handleSaveItem = (n: number, key: string, patch: { value?: string; isDone?: boolean }) =>
    runAction(() => erpApi.updateChecklistItem(installationId, n, key, patch));

  // ---- media handlers (operate on the selected stage) ----
  const handleUploadPhotos = (files: File[], meta: { checklistKey?: string; caption?: string }) =>
    runAction(() => erpApi.uploadStagePhotos(installationId, selectedStage, files, meta), 'Photos ajoutées.');
  const handleDeletePhoto = (photoId: string) => {
    if (!window.confirm('Supprimer cette photo ?')) return;
    setLightboxIndex(-1);
    runAction(() => erpApi.deleteStagePhoto(installationId, selectedStage, photoId), 'Photo supprimée.');
  };
  const handleUploadDocument = (file: File, meta: { checklistKey?: string }) =>
    runAction(() => erpApi.uploadStageDocument(installationId, selectedStage, file, meta), 'Document ajouté.');
  const handleDeleteDocument = (docId: string) => {
    if (!window.confirm('Supprimer ce document ?')) return;
    runAction(() => erpApi.deleteStageDocument(installationId, selectedStage, docId), 'Document supprimé.');
  };
  const handleAddArtifact = (n: number, type: ChecklistItemType) => {
    setSelectedStage(n);
    setTab(type === 'photo' ? 'photos' : 'documents');
  };

  // ---- modal submissions ----
  const submitReason = () => {
    if (!reason.trim()) { setNotice('Un motif est obligatoire.'); return; }
    if (modal?.kind === 'block') {
      runAction(() => erpApi.blockStage(installationId, modal.stage, reason.trim()), 'Étape bloquée.');
    } else if (modal?.kind === 'override') {
      runAction(() => erpApi.completeStage(installationId, modal.stage, { adminOverride: true, reason: reason.trim() }), 'Étape validée (forçage admin).');
    } else if (modal?.kind === 'cancel') {
      runAction(() => erpApi.cancelInstallation(installationId, reason.trim()), 'Installation annulée.');
    }
    setModal(null);
    setReason('');
  };

  const openEdit = () => {
    if (!installation) return;
    setForm({
      title: installation.title || '',
      powerKwc: installation.powerKwc != null ? String(installation.powerKwc) : '',
      systemType: installation.systemType || 'on_grid',
      address: installation.address || '',
      city: installation.city || '',
      governorate: installation.governorate || '',
      startDate: installation.startDate ? installation.startDate.slice(0, 10) : '',
      targetEndDate: installation.targetEndDate ? installation.targetEndDate.slice(0, 10) : '',
      stegFileNumber: installation.stegFileNumber || '',
      notes: installation.notes || '',
    });
    setModal({ kind: 'edit' });
  };

  const submitEdit = () => {
    const payload: Record<string, unknown> = {
      title: form.title,
      systemType: form.systemType,
      address: form.address,
      city: form.city,
      governorate: form.governorate,
      stegFileNumber: form.stegFileNumber,
      notes: form.notes,
    };
    if (form.powerKwc !== '') payload.powerKwc = Number(form.powerKwc);
    if (form.startDate) payload.startDate = form.startDate;
    if (form.targetEndDate) payload.targetEndDate = form.targetEndDate;
    runAction(() => erpApi.updateInstallation(installationId, payload), 'Installation mise à jour.');
    setModal(null);
  };

  const openAssign = async () => {
    setModal({ kind: 'assign' });
    setSelectedEmp(typeof installation?.technicianId === 'object' && installation?.technicianId
      ? (installation.technicianId as { _id: string })._id : '');
    if (employees.length === 0) {
      try { setEmployees(await erpApi.listEmployees()); } catch { /* ignore */ }
    }
  };

  const submitAssign = () => {
    runAction(() => erpApi.updateInstallation(installationId, { technicianId: selectedEmp || undefined } as Partial<ErpInstallation>), 'Technicien assigné.');
    setModal(null);
  };

  if (loading) return <LoadingScreen label="Chargement de l'installation…" />;
  if (error || !installation) {
    return (
      <>
        <div className="flex-between mb-16">
          <button className="btn btn-ghost btn-sm" onClick={onBack}><Icon name="chevron-left" size={15} /> Retour</button>
        </div>
        <EmptyState icon="alert-triangle" title="Installation introuvable" subtitle={error} />
      </>
    );
  }

  const status = installation.status || 'active';
  const statusMeta = INSTALLATION_STATUS_META[status];
  const currentStage = installation.currentStage || 1;
  const late = isLate(installation.targetEndDate, status);
  const customer = installation.customerId;
  const customerPhone = typeof customer === 'object' && customer ? customer.phone : undefined;
  const events: InstallationEvent[] = installation.events || [];
  const stages = installation.stages || [];
  const selStage = stages.find((s) => s.stageNumber === selectedStage);
  const canEditMedia = status === 'active' && canEditStage(currentUser.role, selectedStage);
  const photoOptions = (selStage?.checklist || []).filter((i) => i.type === 'photo').map((i) => ({ key: i.key, label: i.label }));
  const docOptions = (selStage?.checklist || []).filter((i) => i.type === 'document').map((i) => ({ key: i.key, label: i.label }));

  return (
    <>
      {/* Header */}
      <div className="flex-between mb-16">
        <div className="flex-center">
          <button className="btn btn-ghost btn-sm" onClick={onBack}><Icon name="chevron-left" size={15} /> Retour</button>
          <div style={{ marginLeft: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>{installation.title}</h2>
            <div className="flex-center gap-8" style={{ marginTop: 4 }}>
              <Badge color="gray">{installation.reference}</Badge>
              <span className={`badge badge-${statusMeta.badge}`}><span className="badge-dot" />{statusMeta.label}</span>
              {late && <Badge color="red">En retard</Badge>}
              {installation.isBlocked && <Badge color="amber">Bloquée</Badge>}
            </div>
          </div>
        </div>
        {isAdmin && status === 'active' && (
          <div className="flex gap-8">
            <button className="btn btn-ghost btn-sm" onClick={openEdit} disabled={busy}><Icon name="pen" size={14} /> Modifier</button>
            <button className="btn btn-ghost btn-sm" onClick={openAssign} disabled={busy}><Icon name="users" size={14} /> Assigner</button>
            <button className="btn btn-danger btn-sm" onClick={() => { setReason(''); setModal({ kind: 'cancel' }); }} disabled={busy}><Icon name="x" size={14} /> Annuler</button>
          </div>
        )}
      </div>

      {notice && (
        <div className="msg-box info mb-16" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{notice}</span>
          <button className="icon-btn" onClick={() => setNotice('')} aria-label="Fermer"><Icon name="x" size={13} /></button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-2 mb-16">
        <div className="card">
          <h4 className="card-title">Chantier</h4>
          <div className="kv">
            {kv('Client', installation.customerName || personName(customer))}
            {kv('Téléphone', customerPhone ? <a href={`tel:${customerPhone}`}>{customerPhone}</a> : '—')}
            {kv('Puissance', installation.powerKwc != null ? `${installation.powerKwc} kWc` : '—')}
            {kv('Type système', SYSTEM_TYPE_LABEL[installation.systemType || ''] || '—')}
            {kv('Adresse', installation.address || '—')}
            {kv('Ville / Gouvernorat', [installation.city, installation.governorate].filter(Boolean).join(' / ') || '—')}
            {kv('Devis lié', typeof installation.quoteId === 'object' && installation.quoteId ? (installation.quoteId.quoteNumber || 'Voir devis') : '—')}
          </div>
        </div>

        <div className="card">
          <h4 className="card-title">Suivi</h4>
          <div className="kv">
            {kv('Étape actuelle', `${currentStage}/10 · ${stageMeta(currentStage).label}`)}
            {kv('Progression', <ProgressBar value={installation.progress || 0} />)}
            {kv('Technicien', personName(installation.technicianId))}
            {kv('Date de début', formatDate(installation.startDate))}
            {kv('Date cible', formatDate(installation.targetEndDate))}
            {kv('N° dossier STEG', installation.stegFileNumber || '—')}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${tab === 'timeline' ? 'active' : ''}`} onClick={() => setTab('timeline')}>Chronologie</button>
        <button className={`tab ${tab === 'photos' ? 'active' : ''}`} onClick={() => setTab('photos')}>Photos</button>
        <button className={`tab ${tab === 'documents' ? 'active' : ''}`} onClick={() => setTab('documents')}>Documents</button>
        <button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
          Historique
          {events.length > 0 && <span className="tab-dot" />}
        </button>
      </div>

      {tab === 'timeline' && (
        <div className="card">
          {installation.stages && installation.stages.length > 0 ? (
            <StageTimeline
              stages={installation.stages}
              currentStage={currentStage}
              status={status}
              role={currentUser.role}
              isAdmin={isAdmin}
              busy={busy}
              onStart={handleStart}
              onComplete={handleComplete}
              onBlock={handleBlock}
              onUnblock={handleUnblock}
              onSaveItem={handleSaveItem}
              onAddArtifact={handleAddArtifact}
            />
          ) : (
            <EmptyState icon="inbox" title="Aucune étape" subtitle="Cette installation n'a pas d'étapes initialisées." />
          )}
        </div>
      )}

      {tab === 'photos' && (
        <div className="card">
          <StagePicker stages={stages} value={selectedStage} onChange={setSelectedStage} mode="photo" />
          {selStage ? (
            <>
              <div className="mt-16">
                <PhotoUploader
                  onUpload={handleUploadPhotos}
                  busy={busy}
                  disabled={!canEditMedia}
                  checklistOptions={photoOptions}
                />
              </div>
              <div className="mt-16">
                <PhotoGallery
                  photos={selStage.photos || []}
                  onOpen={setLightboxIndex}
                  canDelete={canEditMedia}
                  onDelete={handleDeletePhoto}
                />
              </div>
              {lightboxIndex >= 0 && (
                <Lightbox
                  photos={selStage.photos || []}
                  index={lightboxIndex}
                  onClose={() => setLightboxIndex(-1)}
                  onNav={(d) => setLightboxIndex((i) => Math.max(0, Math.min((selStage.photos?.length || 1) - 1, i + d)))}
                  canDelete={canEditMedia}
                  onDelete={handleDeletePhoto}
                />
              )}
            </>
          ) : (
            <EmptyState icon="camera" title="Sélectionnez une étape" />
          )}
        </div>
      )}

      {tab === 'documents' && (
        <div className="card">
          <StagePicker stages={stages} value={selectedStage} onChange={setSelectedStage} mode="document" />
          {selStage ? (
            <div className="mt-16">
              <DocumentPanel
                stage={selStage}
                canEdit={canEditMedia}
                busy={busy}
                onUpload={handleUploadDocument}
                onDelete={handleDeleteDocument}
                checklistOptions={docOptions}
              />
            </div>
          ) : (
            <EmptyState icon="paperclip" title="Sélectionnez une étape" />
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="card">
          <EventLog events={events} />
        </div>
      )}

      {/* Block / override / cancel reason modal */}
      <Modal
        open={modal?.kind === 'block' || modal?.kind === 'override' || modal?.kind === 'cancel'}
        title={modal?.kind === 'cancel' ? 'Annuler l’installation' : modal?.kind === 'override' ? 'Forcer la validation (admin)' : 'Bloquer l’étape'}
        onClose={() => setModal(null)}
        footer={
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>Annuler</button>
            <button className={`btn ${modal?.kind === 'override' ? 'btn-warning' : modal?.kind === 'cancel' ? 'btn-danger' : 'btn-primary'} btn-sm`} onClick={submitReason} disabled={busy}>
              Confirmer
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Motif (obligatoire)</label>
          <textarea
            className="textarea"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={modal?.kind === 'cancel' ? 'Raison de l’annulation…' : 'Décrivez le motif…'}
          />
          {modal?.kind === 'override' && (
            <p className="form-hint">Le forçage permet de valider une étape dont la checklist est incomplète. Il est journalisé.</p>
          )}
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal
        open={modal?.kind === 'edit'}
        title="Modifier l’installation"
        width={620}
        onClose={() => setModal(null)}
        footer={
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>Annuler</button>
            <button className="btn btn-primary btn-sm" onClick={submitEdit} disabled={busy || !form.title}>Enregistrer</button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Titre</label>
            <input className="input" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Puissance (kWc)</label>
            <input className="input" type="number" min="0" step="0.1" value={form.powerKwc || ''} onChange={(e) => setForm({ ...form, powerKwc: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Type de système</label>
            <select className="select" value={form.systemType || 'on_grid'} onChange={(e) => setForm({ ...form, systemType: e.target.value })}>
              {SYSTEM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">N° dossier STEG</label>
            <input className="input" value={form.stegFileNumber || ''} onChange={(e) => setForm({ ...form, stegFileNumber: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Adresse</label>
            <input className="input" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Ville</label>
            <input className="input" value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Gouvernorat</label>
            <input className="input" value={form.governorate || ''} onChange={(e) => setForm({ ...form, governorate: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Date de début</label>
            <input className="input" type="date" value={form.startDate || ''} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Date cible</label>
            <input className="input" type="date" value={form.targetEndDate || ''} onChange={(e) => setForm({ ...form, targetEndDate: e.target.value })} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="textarea" rows={3} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </Modal>

      {/* Assign modal */}
      <Modal
        open={modal?.kind === 'assign'}
        title="Assigner un technicien"
        onClose={() => setModal(null)}
        footer={
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>Annuler</button>
            <button className="btn btn-primary btn-sm" onClick={submitAssign} disabled={busy}>Enregistrer</button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Technicien</label>
          <select className="select" value={selectedEmp} onChange={(e) => setSelectedEmp(e.target.value)}>
            <option value="">— Aucun —</option>
            {employees.map((emp) => (
              <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}{emp.employeeId ? ` (${emp.employeeId})` : ''}</option>
            ))}
          </select>
          {employees.length === 0 && <p className="form-hint">Aucun employé disponible.</p>}
        </div>
      </Modal>
    </>
  );
}
