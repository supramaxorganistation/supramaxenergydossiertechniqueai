import { useCallback, useRef, useState } from 'react';
import { api, fileUrl } from '../api';
import type { ComplianceReport, Dossier, User } from '../types';
import CompliancePanel from '../components/CompliancePanel';
import { StatusBadge, Badge, EmptyState } from '../components/ui';

type Tab = 'overview' | 'compliance' | 'equipment' | 'export';

function kv(label: string, value: React.ReactNode) {
  return (
    <div className="kv-item">
      <span className="k">{label}</span>
      <span className="v">{value}</span>
    </div>
  );
}

export default function DossierDetailPage({
  dossier,
  currentUser,
  compliance,
  isLoadingCompliance,
  onBack,
  onRefresh,
}: {
  dossier: Dossier;
  currentUser: User;
  compliance: ComplianceReport | null;
  isLoadingCompliance: boolean;
  onBack: () => void;
  onRefresh: () => Promise<void>;
}) {
  const [tab, setTab] = useState<Tab>('overview');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [datasheetFile, setDatasheetFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [notice, setNotice] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const p = dossier.pvSystemParams;
  const canManage =
    currentUser.role === 'admin' ||
    currentUser.role === 'technician' ||
    (currentUser.role === 'client' && dossier.createdBy.email === currentUser.email);

  const handleUpload = useCallback(async () => {
    if (!uploadFile) return;
    setIsUploading(true);
    setNotice('');
    try {
      await api.uploadFile(dossier._id, uploadFile);
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setNotice('Document téléversé avec succès.');
      await onRefresh();
    } catch (err: any) {
      setNotice(`Erreur : ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  }, [uploadFile, dossier._id, onRefresh]);

  const handleScan = useCallback(async () => {
    if (!datasheetFile) return;
    setIsScanning(true);
    setNotice('');
    setScanResult(null);
    try {
      const result = await api.scanDatasheet(dossier._id, datasheetFile);
      setScanResult(result.scannedData);
      setDatasheetFile(null);
      setNotice('Fiche technique analysée et données équipement mises à jour.');
      await onRefresh();
    } catch (err: any) {
      setNotice(`Erreur lors de l'analyse : ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  }, [datasheetFile, dossier._id, onRefresh]);

  const handleGeneratePdf = useCallback(async () => {
    setIsGeneratingPdf(true);
    setNotice('');
    try {
      const { blob, filename } = await api.exportPdf(dossier._id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setNotice(`Erreur lors de la génération : ${err.message}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [dossier._id]);

  const complianceOk = compliance?.summary?.fullCompliant;
  const complianceError = compliance?.summary?.errorCount ? compliance.summary.errorCount : 0;

  return (
    <>
      <div className="flex-between mb-16">
        <div className="flex-center">
          <button className="btn btn-ghost btn-sm" onClick={onBack}>← Retour</button>
          <div style={{ marginLeft: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>{dossier.customerDetails.name}</h2>
            <div className="flex-center mt-12" style={{ marginTop: 4 }}>
              <StatusBadge status={dossier.status} />
              <Badge color="blue">{p.peakPowerKwc} kWc</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>
          📋 Vue d'ensemble
        </button>
        <button className={`tab ${tab === 'compliance' ? 'active' : ''}`} onClick={() => setTab('compliance')}>
          ✅ Conformité STEG
          {compliance && !complianceOk && complianceError > 0 && <span style={{ marginLeft: 6 }}>❌</span>}
        </button>
        <button className={`tab ${tab === 'equipment' ? 'active' : ''}`} onClick={() => setTab('equipment')}>
          🤖 Équipements & documents
        </button>
        <button className={`tab ${tab === 'export' ? 'active' : ''}`} onClick={() => setTab('export')}>
          📄 Export
        </button>
      </div>

      {notice && (
        <div className="msg-box info mb-16" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{notice}</span>
          <button className="icon-btn" onClick={() => setNotice('')}>✕</button>
        </div>
      )}

      {tab === 'overview' && (
        <>
          <div className="grid grid-2">
            <div className="card">
              <h4 className="card-title">👤 Informations client</h4>
              <div className="kv">
                {kv('Nom complet', dossier.customerDetails.name)}
                {kv('CIN', dossier.customerDetails.cin)}
                {kv('Téléphone', dossier.customerDetails.phone)}
                {kv('Réf. compteur STEG', dossier.customerDetails.stegMeterRef)}
                {kv('Adresse', dossier.customerDetails.address)}
                {kv('Créé le', new Date(dossier.createdAt).toLocaleDateString('fr-FR'))}
                {kv('Par', dossier.createdBy?.name)}
                {kv('Technicien', dossier.assignedTechnician?.name || '—')}
              </div>
            </div>

            <div className="card">
              <h4 className="card-title">🔆 Système PV</h4>
              <div className="kv">
                {kv('Puissance crête', `${p.peakPowerKwc} kWc`)}
                {kv('Panneaux', `${p.panelCount} × ${p.panelBrand}`)}
                {kv('Onduleur', p.inverterModel)}
                {kv('Phase AC', p.acPhase === 'tri' ? 'Triphasé (400 V)' : 'Monophasé (230 V)')}
                {kv('Câble DC', `${p.dcCableLength} m`)}
                {kv('Câble AC', `${p.acCableLength} m`)}
                {kv('Temp. min / max', `${p.tmin ?? '-'} / ${p.tmax ?? '-'} °C`)}
              </div>
            </div>
          </div>

          <div className="grid grid-2">
            <div className="card">
              <h4 className="card-title">🧮 Calculs</h4>
              <div className="kv">
                {kv('Production annuelle estimée', `${(dossier.calculations?.estimatedAnnualYieldKwh || 0).toLocaleString('fr-FR')} kWh`)}
                {kv('Chute de tension DC', `${(dossier.calculations?.dcVoltageDropPercent || 0).toFixed(2)} %`)}
                {kv('Chute de tension AC', `${(dossier.calculations?.acVoltageDropPercent || 0).toFixed(2)} %`)}
                {kv('Statut', dossier.calculations?.statusOk ? '✅ OK' : '❌ À corriger')}
              </div>
            </div>

            <div className="card">
              <h4 className="card-title">🏗️ Structure & site</h4>
              <div className="kv">
                {kv('Surface panneau', p.panelAreaM2 ? `${p.panelAreaM2} m²` : '—')}
                {kv('Poids panneau', p.panelWeightKg ? `${p.panelWeightKg} kg` : '—')}
                {kv('Hauteur support', p.supportHeightM ? `${p.supportHeightM} m` : '—')}
                {kv('Ballast installé', p.ballastWeightKg ? `${p.ballastWeightKg} kg` : '—')}
                {kv('Vitesse vent', p.windSpeedKmh ? `${p.windSpeedKmh} km/h` : '—')}
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'compliance' && (
        <div className="card">
          <h4 className="card-title">✅ Rapport de Conformité STEG</h4>
          <p className="card-subtitle">
            Vérification complète des critères STEG : chaînes, ratio de puissance, protections,
            câbles (NF C 15-100) et tenue au vent.
          </p>
          {isLoadingCompliance ? (
            <div className="loading-screen" style={{ minHeight: 200 }}>
              <span className="spinner" />
              Calcul de conformité en cours...
            </div>
          ) : compliance ? (
            <CompliancePanel report={compliance} />
          ) : (
            <EmptyState icon="✅" title="Rapport indisponible" subtitle="Les données du dossier sont insuffisantes pour le calcul." />
          )}
        </div>
      )}

      {tab === 'equipment' && (
        <>
          <div className="card">
            <h4 className="card-title">📦 Équipements</h4>
            <p className="card-subtitle">
              Caractéristiques extraites par l'IA à partir des fiches techniques (datasheets).
            </p>
            {Object.entries(dossier.equipment || {}).some(([, v]) => v?.brand || v?.model) ? (
              <div className="grid grid-2">
                {Object.entries(dossier.equipment).map(([key, value]) => {
                  const hasData = value?.brand || value?.model;
                  if (!hasData) return null;
                  const labels: Record<string, string> = {
                    panel: 'Panneau',
                    inverter: 'Onduleur',
                    dcProtection: 'Protection DC',
                    acProtection: 'Protection AC',
                    dcCable: 'Câble DC',
                    acCable: 'Câble AC',
                  };
                  return (
                    <div key={key}>
                      <h5 style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
                        {labels[key] || key}
                      </h5>
                      <div className="kv">
                        {value.brand && kv('Marque', value.brand)}
                        {value.model && kv('Modèle', value.model)}
                        {value.specs &&
                          Object.entries(value.specs).map(([k, v]) =>
                            v !== null && v !== undefined && v !== '' ? kv(k, String(v)) : null
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon="📦"
                title="Aucun équipement renseigné"
                subtitle="Utilisez le scanner IA ci-dessous pour extraire les caractéristiques des datasheets."
              />
            )}
          </div>

          {canManage && (
            <div className="card">
              <h4 className="card-title">🤖 Scanner IA de datasheet</h4>
              <p className="card-subtitle">
                Uploadez une fiche technique PDF (panneau, onduleur, protection, câble) pour
                extraire automatiquement les spécifications techniques.
              </p>
              <div className="flex gap-8">
                <label className="file-drop" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {datasheetFile ? '📄 ' + datasheetFile.name : '📤 Choisir une fiche technique PDF'}
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    style={{ display: 'none' }}
                    onChange={(e) => setDatasheetFile(e.target.files?.[0] || null)}
                  />
                </label>
                <button className="btn btn-primary" onClick={handleScan} disabled={!datasheetFile || isScanning}>
                  {isScanning ? 'Analyse...' : 'Scanner'}
                </button>
              </div>
              {scanResult && (
                <div className="msg-box info mt-12">
                  <strong>Extrait :</strong> {scanResult.brand} {scanResult.model}{' '}
                  <span style={{ textTransform: 'capitalize' }}>({scanResult.category})</span> — données
                  renseignées dans les champs équipement.
                </div>
              )}
            </div>
          )}

          <div className="card">
            <h4 className="card-title">📎 Documents</h4>
            {dossier.documents?.length ? (
              <ul style={{ listStyle: 'none' }}>
                {dossier.documents.map((doc, idx) => (
                  <li
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 0',
                      borderBottom: '1px dashed var(--border)',
                      fontSize: 13.5,
                    }}
                  >
                    <a href={fileUrl(doc.fileUrl)} target="_blank" rel="noreferrer">
                      📄 {doc.fileName}
                    </a>
                    <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>
                      {new Date(doc.uploadedAt).toLocaleDateString('fr-FR')}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon="📎" title="Aucun document" subtitle="Téléversez les pièces du dossier (factures, plans, fiches...)." />
            )}

            {canManage && (
              <div className="flex gap-8 mt-16">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  style={{ flex: 1 }}
                />
                <button className="btn btn-ghost" onClick={handleUpload} disabled={!uploadFile || isUploading}>
                  {isUploading ? 'Envoi...' : 'Téléverser'}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'export' && (
        <div className="card">
          <h4 className="card-title">📄 Génération du dossier technique STEG</h4>
          <p className="card-subtitle">
            Génère un dossier technique complet conforme STEG incluant : ajustements de température,
            compatibilité des chaînes, dimensionnement des câbles (NF C 15-100), analyse des chutes
            de tension, protections DC/AC, tenue au vent et résumé de conformité.
          </p>
          <button
            className="btn btn-success"
            style={{ width: '100%', padding: 14, fontSize: 14 }}
            onClick={handleGeneratePdf}
            disabled={isGeneratingPdf}
          >
            {isGeneratingPdf ? '⏳ Génération du PDF en cours...' : '📥 Télécharger le dossier technique PDF'}
          </button>
        </div>
      )}
    </>
  );
}
