import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import type { Dossier, Equipment, CatalogEquipment } from '../types';

type FormState = {
  customerName: string;
  customerCin: string;
  customerPhone: string;
  customerAddress: string;
  stegMeterRef: string;

  peakPowerKwc: string;
  panelCount: string;
  panelBrand: string;
  panelModel: string;
  pmax: string;
  vmpp: string;
  impp: string;
  voc: string;
  isc: string;
  coeffVoc: string;
  coeffIsc: string;
  irm: string;
  panelAreaM2: string;
  panelWeightKg: string;

  inverterBrand: string;
  inverterModel: string;
  inverterPower: string;
  vdcMax: string;
  mpptMin: string;
  mpptMax: string;
  idcMax: string;
  iscMax: string;
  nbMppt: string;
  iacMax: string;

  dcSwitchUsec: string;
  dcSwitchIn: string;
  spdDcUcpv: string;
  spdDcUp: string;
  spdDcIn: string;
  spdDcIscpv: string;
  dcProtUw: string;

  acBreakerIn: string;
  acBreakerSensitivity: string;
  spdAcUc: string;
  spdAcUp: string;
  spdAcIn: string;
  acProtUw: string;

  dcCableSection: string;
  dcCableIz: string;
  dcCableMaterial: string;
  dcCableInsulation: string;
  acCableSection: string;
  acCableIz: string;
  acCableMaterial: string;
  acCableInsulation: string;

  dcCableLength: string;
  acCableLength: string;
  acPhase: 'mono' | 'tri';
  tmin: string;
  tmax: string;
  dcCableGrouping: string;
  dcCableTemp: string;
  acCableGrouping: string;
  acCableTemp: string;

  supportHeightM: string;
  ballastLeverM: string;
  ballastWeightKg: string;
  windSpeedKmh: string;
};

const INITIAL: FormState = {
  customerName: '',
  customerCin: '',
  customerPhone: '',
  customerAddress: '',
  stegMeterRef: '',

  peakPowerKwc: '3',
  panelCount: '8',
  panelBrand: 'JinkoSolar',
  panelModel: 'JKM555M-72HL4',
  pmax: '',
  vmpp: '',
  impp: '',
  voc: '',
  isc: '',
  coeffVoc: '',
  coeffIsc: '',
  irm: '',
  panelAreaM2: '2.58',
  panelWeightKg: '27.5',

  inverterBrand: '',
  inverterModel: 'Growatt 3000S',
  inverterPower: '3',
  vdcMax: '',
  mpptMin: '',
  mpptMax: '',
  idcMax: '',
  iscMax: '',
  nbMppt: '',
  iacMax: '',

  dcSwitchUsec: '',
  dcSwitchIn: '',
  spdDcUcpv: '',
  spdDcUp: '',
  spdDcIn: '',
  spdDcIscpv: '',
  dcProtUw: '',

  acBreakerIn: '',
  acBreakerSensitivity: '',
  spdAcUc: '',
  spdAcUp: '',
  spdAcIn: '',
  acProtUw: '',

  dcCableSection: '',
  dcCableIz: '',
  dcCableMaterial: '',
  dcCableInsulation: '',
  acCableSection: '',
  acCableIz: '',
  acCableMaterial: '',
  acCableInsulation: '',

  dcCableLength: '20',
  acCableLength: '10',
  acPhase: 'mono',
  tmin: '-10',
  tmax: '85',
  dcCableGrouping: '1',
  dcCableTemp: '50',
  acCableGrouping: '1',
  acCableTemp: '40',

  supportHeightM: '0.5',
  ballastLeverM: '0.6',
  ballastWeightKg: '0',
  windSpeedKmh: '130',
};

const CATEGORY_LABEL: Record<string, string> = {
  PANEL: 'Panneau PV',
  INVERTER: 'Onduleur',
  PROTECTION_DC: 'Protection DC',
  PROTECTION_AC: 'Protection AC',
  CABLE: 'Câble',
};

function num(v: unknown): number | null {
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

function SectionScanner({
  file,
  busy,
  onFile,
  onScan,
  showCableType,
  cableType,
  onCableType,
}: {
  file: File | null;
  busy: boolean;
  onFile: (f: File | null) => void;
  onScan: () => void;
  showCableType?: boolean;
  cableType?: 'AC' | 'DC';
  onCableType?: (t: 'AC' | 'DC') => void;
}) {
  return (
    <div className="flex gap-8" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
      <label className="btn btn-sm btn-ghost" style={{ cursor: 'pointer', margin: 0 }}>
        {file ? '📄 ' + file.name : '📤 Fiche technique PDF'}
        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          style={{ display: 'none' }}
          onChange={(e) => onFile(e.target.files?.[0] || null)}
        />
      </label>
      {showCableType && (
        <select
          className="select"
          style={{ width: 'auto', padding: '6px 8px' }}
          value={cableType}
          onChange={(e) => onCableType?.(e.target.value as 'AC' | 'DC')}
          title="Type de câble"
        >
          <option value="DC">Câble DC</option>
          <option value="AC">Câble AC</option>
        </select>
      )}
      <button type="button" className="btn btn-sm btn-primary" disabled={!file || busy} onClick={onScan}>
        {busy ? 'Analyse...' : 'Scanner & remplir'}
      </button>
    </div>
  );
}

function buildEquipment(form: FormState): Equipment {
  const f = (v: string) => (v.trim() !== '' ? parseFloat(v) : undefined);
  const s = (v: string) => (v.trim() ? v.trim() : undefined);
  const clean = (specs: Record<string, number | string | undefined>) =>
    Object.fromEntries(Object.entries(specs).filter(([, v]) => v !== undefined));

  const equipment: Equipment = {};

  const panelSpecs = clean({
    pmax: f(form.pmax),
    vmpp: f(form.vmpp),
    impp: f(form.impp),
    voc: f(form.voc),
    isc: f(form.isc),
    coeffVoc: f(form.coeffVoc),
    coeffIsc: f(form.coeffIsc),
    irm: f(form.irm),
    panelAreaM2: f(form.panelAreaM2),
    panelWeightKg: f(form.panelWeightKg),
  });
  if (s(form.panelBrand) || s(form.panelModel) || Object.keys(panelSpecs).length) {
    equipment.panel = { brand: s(form.panelBrand), model: s(form.panelModel), specs: panelSpecs };
  }

  const pac = f(form.inverterPower);
  const inverterSpecs = clean({
    pac: pac != null ? pac * 1000 : undefined,
    vdcMax: f(form.vdcMax),
    mpptMin: f(form.mpptMin),
    mpptMax: f(form.mpptMax),
    idcMax: f(form.idcMax),
    iscMax: f(form.iscMax),
    nbMppt: f(form.nbMppt),
    iacMax: f(form.iacMax),
  });
  if (s(form.inverterBrand) || s(form.inverterModel) || Object.keys(inverterSpecs).length) {
    equipment.inverter = { brand: s(form.inverterBrand), model: s(form.inverterModel), specs: inverterSpecs };
  }

  const dcProtSpecs = clean({
    usec: f(form.dcSwitchUsec),
    inDisj: f(form.dcSwitchIn),
    ucpv: f(form.spdDcUcpv),
    up: f(form.spdDcUp),
    in: f(form.spdDcIn),
    iscpv: f(form.spdDcIscpv),
    uw: f(form.dcProtUw),
  });
  if (Object.keys(dcProtSpecs).length) {
    equipment.dcProtection = { specs: dcProtSpecs };
  }

  const sensitivity = f(form.acBreakerSensitivity);
  const acProtSpecs = clean({
    inDisj: f(form.acBreakerIn),
    sensitivityA: sensitivity != null ? sensitivity : undefined,
    uc: f(form.spdAcUc),
    up: f(form.spdAcUp),
    in: f(form.spdAcIn),
    uw: f(form.acProtUw),
  });
  if (Object.keys(acProtSpecs).length) {
    equipment.acProtection = { specs: acProtSpecs };
  }

  const dcCableSpecs = clean({
    section: f(form.dcCableSection),
    iz: f(form.dcCableIz),
    material: s(form.dcCableMaterial),
    insulation: s(form.dcCableInsulation),
  });
  if (Object.keys(dcCableSpecs).length) {
    equipment.dcCable = { specs: dcCableSpecs };
  }

  const acCableSpecs = clean({
    section: f(form.acCableSection),
    iz: f(form.acCableIz),
    material: s(form.acCableMaterial),
    insulation: s(form.acCableInsulation),
  });
  if (Object.keys(acCableSpecs).length) {
    equipment.acCable = { specs: acCableSpecs };
  }

  return equipment;
}

export default function DossierCreatePage({
  onCreated,
  onCancel,
}: {
  onCreated: (d: Dossier) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [catalog, setCatalog] = useState<CatalogEquipment[]>([]);
  const [scans, setScans] = useState<Record<string, { file: File | null; busy: boolean }>>({});
  const [cableType, setCableType] = useState<'AC' | 'DC'>('DC');
  const [scanNotice, setScanNotice] = useState('');
  const [scanError, setScanError] = useState('');

  useEffect(() => {
    api.listEquipment().then(setCatalog).catch(() => setCatalog([]));
  }, []);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const equipmentCount = useMemo(() => Object.keys(buildEquipment(form)).length, [form]);

  const applyEquipment = (scanned: CatalogEquipment) => {
    const patch: Partial<FormState> = {};
    const p = scanned.specs || {};

    if (scanned.category === 'PANEL') {
      if (scanned.brand) patch.panelBrand = scanned.brand;
      if (scanned.model) patch.panelModel = scanned.model;
      const pmax = num(p.pmax);
      if (pmax != null) {
        patch.pmax = String(pmax);
        const cnt = parseInt(form.panelCount) || 0;
        if (cnt > 0) patch.peakPowerKwc = String(Math.round(((pmax * cnt) / 1000) * 1000) / 1000);
      }
      if (num(p.vmpp) != null) patch.vmpp = String(num(p.vmpp));
      if (num(p.impp) != null) patch.impp = String(num(p.impp));
      if (num(p.voc) != null) patch.voc = String(num(p.voc));
      if (num(p.isc) != null) patch.isc = String(num(p.isc));
      if (num(p.coeffVoc) != null) patch.coeffVoc = String(num(p.coeffVoc));
      if (num(p.coeffIsc) != null) patch.coeffIsc = String(num(p.coeffIsc));
      if (num(p.irm) != null) patch.irm = String(num(p.irm));
      let area = num(p.panelAreaM2);
      if (area == null) {
        const L = num(p.panelLengthMm);
        const W = num(p.panelWidthMm);
        if (L && W) area = (L * W) / 1e6;
      }
      if (area != null) patch.panelAreaM2 = String(Math.round(area * 100) / 100);
      const weight = num(p.panelWeightKg);
      if (weight != null) patch.panelWeightKg = String(Math.round(weight * 10) / 10);
    } else if (scanned.category === 'INVERTER') {
      if (scanned.brand) patch.inverterBrand = scanned.brand;
      if (scanned.model) patch.inverterModel = scanned.model;
      const pac = num(p.pac);
      if (pac != null) patch.inverterPower = String(Math.round((pac / 1000) * 1000) / 1000);
      if (num(p.vdcMax) != null) patch.vdcMax = String(num(p.vdcMax));
      if (num(p.mpptMin) != null) patch.mpptMin = String(num(p.mpptMin));
      if (num(p.mpptMax) != null) patch.mpptMax = String(num(p.mpptMax));
      if (num(p.idcMax) != null) patch.idcMax = String(num(p.idcMax));
      if (num(p.iscMax) != null) patch.iscMax = String(num(p.iscMax));
      if (num(p.nbMppt) != null) patch.nbMppt = String(num(p.nbMppt));
      if (num(p.iacMax) != null) patch.iacMax = String(num(p.iacMax));
    } else if (scanned.category === 'PROTECTION_DC') {
      const hasSpd = num(p.ucpv) != null || num(p.up) != null || num(p.iscpv) != null;
      if (num(p.usec) != null) patch.dcSwitchUsec = String(num(p.usec));
      if (num(p.inDisj) != null) patch.dcSwitchIn = String(num(p.inDisj));
      else if (!hasSpd && num(p.in) != null) patch.dcSwitchIn = String(num(p.in));
      if (num(p.ucpv) != null) patch.spdDcUcpv = String(num(p.ucpv));
      if (num(p.up) != null) patch.spdDcUp = String(num(p.up));
      if (hasSpd && num(p.in) != null) patch.spdDcIn = String(num(p.in));
      if (num(p.iscpv) != null) patch.spdDcIscpv = String(num(p.iscpv));
      if (num(p.uw) != null) patch.dcProtUw = String(num(p.uw));
    } else if (scanned.category === 'PROTECTION_AC') {
      const hasSpd = num(p.uc) != null || num(p.up) != null;
      if (num(p.in) != null && !hasSpd) patch.acBreakerIn = String(num(p.in));
      if (num(p.inDisj) != null) patch.acBreakerIn = String(num(p.inDisj));
      const sensMa = num(p.sensitivity);
      if (sensMa != null) patch.acBreakerSensitivity = String(sensMa / 1000);
      if (num(p.uc) != null) patch.spdAcUc = String(num(p.uc));
      if (num(p.up) != null) patch.spdAcUp = String(num(p.up));
      if (hasSpd && num(p.in) != null) patch.spdAcIn = String(num(p.in));
      if (num(p.uw) != null) patch.acProtUw = String(num(p.uw));
    } else if (scanned.category === 'CABLE') {
      const target = scanned.cableType === 'AC';
      if (num(p.section) != null) {
        if (target) patch.acCableSection = String(num(p.section));
        else patch.dcCableSection = String(num(p.section));
      }
      if (num(p.iz) != null) {
        if (target) patch.acCableIz = String(num(p.iz));
        else patch.dcCableIz = String(num(p.iz));
      }
      const material = typeof p.material === 'string' ? p.material : undefined;
      if (material) {
        if (target) patch.acCableMaterial = material;
        else patch.dcCableMaterial = material;
      }
      const insulation = typeof p.insulation === 'string' ? p.insulation : undefined;
      if (insulation) {
        if (target) patch.acCableInsulation = insulation;
        else patch.dcCableInsulation = insulation;
      }
    }

    setForm((f) => ({ ...f, ...patch }));
  };

  const setScanFile = (section: string, file: File | null) =>
    setScans((s) => ({ ...s, [section]: { file, busy: s[section]?.busy ?? false } }));

  const handleScan = async (section: string) => {
    const file = scans[section]?.file;
    if (!file) return;
    setScans((s) => ({ ...s, [section]: { file, busy: true } }));
    setScanNotice('');
    setScanError('');
    try {
      const res = await api.scanEquipment(file, section === 'cable' ? cableType : undefined);
      const scanned = res.equipment;
      applyEquipment(scanned);
      setScans((s) => ({ ...s, [section]: { file: null, busy: false } }));
      setScanNotice(
        `Fiche analysée : ${scanned.brand || ''} ${scanned.model || ''} (${CATEGORY_LABEL[scanned.category] || scanned.category}) — champs remplis automatiquement.`
      );
      const list = await api.listEquipment();
      setCatalog(list);
    } catch (err: any) {
      setScans((s) => ({ ...s, [section]: { file, busy: false } }));
      setScanError(err.message || "Erreur lors de l'analyse");
    }
  };

  const handleUse = (item: CatalogEquipment) => {
    applyEquipment(item);
    setScanNotice(
      `Équipement appliqué au formulaire : ${item.brand || ''} ${item.model || ''} (${CATEGORY_LABEL[item.category] || item.category}).`
    );
    setScanError('');
  };

  const handleDeleteEquipment = async (id: string) => {
    try {
      await api.deleteEquipment(id);
      setCatalog((c) => c.filter((e) => e._id !== id));
    } catch (err: any) {
      setScanError(err.message || 'Erreur lors de la suppression');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const dossier = await api.createDossier({
        customerDetails: {
          name: form.customerName,
          cin: form.customerCin,
          phone: form.customerPhone,
          address: form.customerAddress,
          stegMeterRef: form.stegMeterRef,
        },
        pvSystemParams: {
          peakPowerKwc: parseFloat(form.peakPowerKwc) || 0,
          panelCount: parseInt(form.panelCount) || 0,
          panelBrand: form.panelBrand,
          inverterModel: form.inverterModel,
          dcCableLength: parseFloat(form.dcCableLength) || 0,
          acCableLength: parseFloat(form.acCableLength) || 0,
          tmin: parseFloat(form.tmin),
          tmax: parseFloat(form.tmax),
          acPhase: form.acPhase,
          dcCableGrouping: parseInt(form.dcCableGrouping) || undefined,
          dcCableTemp: parseFloat(form.dcCableTemp) || undefined,
          acCableGrouping: parseInt(form.acCableGrouping) || undefined,
          acCableTemp: parseFloat(form.acCableTemp) || undefined,
          panelAreaM2: parseFloat(form.panelAreaM2) || undefined,
          panelWeightKg: parseFloat(form.panelWeightKg) || undefined,
          supportHeightM: parseFloat(form.supportHeightM) || undefined,
          ballastLeverM: parseFloat(form.ballastLeverM) || undefined,
          ballastWeightKg: parseFloat(form.ballastWeightKg) || 0,
          windSpeedKmh: parseFloat(form.windSpeedKmh) || undefined,
        },
        equipment: buildEquipment(form),
      });
      onCreated(dossier);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="card">
        <h3 className="card-title">👤 Informations client</h3>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Nom complet *</label>
            <input className="input" value={form.customerName} onChange={(e) => set('customerName', e.target.value)} placeholder="Ex. Aziza Ajmi" required />
          </div>
          <div className="form-group">
            <label className="form-label">CIN *</label>
            <input className="input" value={form.customerCin} onChange={(e) => set('customerCin', e.target.value)} placeholder="CIN du client" required />
          </div>
          <div className="form-group">
            <label className="form-label">Téléphone *</label>
            <input className="input" value={form.customerPhone} onChange={(e) => set('customerPhone', e.target.value)} placeholder="+216 ..." required />
          </div>
          <div className="form-group">
            <label className="form-label">Réf. compteur STEG *</label>
            <input className="input" value={form.stegMeterRef} onChange={(e) => set('stegMeterRef', e.target.value)} placeholder="N° compteur" required />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Adresse *</label>
            <input className="input" value={form.customerAddress} onChange={(e) => set('customerAddress', e.target.value)} placeholder="Adresse de l'installation" required />
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">🔆 Système photovoltaïque</h3>
        {equipmentCount > 0 && (
          <div className="msg-box info mb-12">{equipmentCount} équipement(s) seront enregistrés avec ce dossier.</div>
        )}
        {scanNotice && <div className="msg-box info mb-12">{scanNotice}</div>}
        {scanError && <div className="msg-box error mb-12">{scanError}</div>}

        <p className="card-subtitle">
          Scannez la fiche technique de chaque composant : les champs de la section correspondante sont remplis
          automatiquement et l'équipement est enregistré dans la base pour être réutilisé dans les prochains dossiers.
        </p>

        <div className="form-section-title">Générateur PV</div>
        <SectionScanner
          file={scans.panel?.file ?? null}
          busy={scans.panel?.busy ?? false}
          onFile={(f) => setScanFile('panel', f)}
          onScan={() => handleScan('panel')}
        />
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Puissance crête (kWc) *</label>
            <input className="input" type="number" step="0.1" value={form.peakPowerKwc} onChange={(e) => set('peakPowerKwc', e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Nombre de panneaux *</label>
            <input className="input" type="number" value={form.panelCount} onChange={(e) => set('panelCount', e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Marque panneau</label>
            <input className="input" value={form.panelBrand} onChange={(e) => set('panelBrand', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Modèle panneau</label>
            <input className="input" value={form.panelModel} onChange={(e) => set('panelModel', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Pmax (W)</label>
            <input className="input" type="number" value={form.pmax} onChange={(e) => set('pmax', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Vmpp (V)</label>
            <input className="input" type="number" step="0.1" value={form.vmpp} onChange={(e) => set('vmpp', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Impp (A)</label>
            <input className="input" type="number" step="0.1" value={form.impp} onChange={(e) => set('impp', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Voc (V)</label>
            <input className="input" type="number" step="0.1" value={form.voc} onChange={(e) => set('voc', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Isc (A)</label>
            <input className="input" type="number" step="0.1" value={form.isc} onChange={(e) => set('isc', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Coeff. Voc (%/°C)</label>
            <input className="input" type="number" step="0.01" value={form.coeffVoc} onChange={(e) => set('coeffVoc', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Coeff. Isc (%/°C)</label>
            <input className="input" type="number" step="0.01" value={form.coeffIsc} onChange={(e) => set('coeffIsc', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">IRM (A)</label>
            <input className="input" type="number" step="0.1" value={form.irm} onChange={(e) => set('irm', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Surface panneau (m²)</label>
            <input className="input" type="number" step="0.01" value={form.panelAreaM2} onChange={(e) => set('panelAreaM2', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Poids panneau (kg)</label>
            <input className="input" type="number" step="0.1" value={form.panelWeightKg} onChange={(e) => set('panelWeightKg', e.target.value)} />
          </div>
        </div>

        <div className="form-section-title">Onduleur</div>
        <SectionScanner
          file={scans.inverter?.file ?? null}
          busy={scans.inverter?.busy ?? false}
          onFile={(f) => setScanFile('inverter', f)}
          onScan={() => handleScan('inverter')}
        />
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Marque onduleur</label>
            <input className="input" value={form.inverterBrand} onChange={(e) => set('inverterBrand', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Modèle onduleur *</label>
            <input className="input" value={form.inverterModel} onChange={(e) => set('inverterModel', e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Puissance AC (kW)</label>
            <input className="input" type="number" step="0.1" value={form.inverterPower} onChange={(e) => set('inverterPower', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Vdc max (V)</label>
            <input className="input" type="number" value={form.vdcMax} onChange={(e) => set('vdcMax', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">MPPT min (V)</label>
            <input className="input" type="number" value={form.mpptMin} onChange={(e) => set('mpptMin', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">MPPT max (V)</label>
            <input className="input" type="number" value={form.mpptMax} onChange={(e) => set('mpptMax', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Idc max (A)</label>
            <input className="input" type="number" step="0.1" value={form.idcMax} onChange={(e) => set('idcMax', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Isc max (A)</label>
            <input className="input" type="number" step="0.1" value={form.iscMax} onChange={(e) => set('iscMax', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Nombre MPPT</label>
            <input className="input" type="number" value={form.nbMppt} onChange={(e) => set('nbMppt', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Iac max (A)</label>
            <input className="input" type="number" step="0.1" value={form.iacMax} onChange={(e) => set('iacMax', e.target.value)} />
          </div>
        </div>

        <div className="form-section-title">Protections DC</div>
        <SectionScanner
          file={scans.protDc?.file ?? null}
          busy={scans.protDc?.busy ?? false}
          onFile={(f) => setScanFile('protDc', f)}
          onScan={() => handleScan('protDc')}
        />
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Sectionneur — U (V)</label>
            <input className="input" type="number" step="0.1" value={form.dcSwitchUsec} onChange={(e) => set('dcSwitchUsec', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Sectionneur — I (A)</label>
            <input className="input" type="number" step="0.1" value={form.dcSwitchIn} onChange={(e) => set('dcSwitchIn', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Parafoudre DC — Ucpv (V)</label>
            <input className="input" type="number" step="0.1" value={form.spdDcUcpv} onChange={(e) => set('spdDcUcpv', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Parafoudre DC — Up (V)</label>
            <input className="input" type="number" step="0.1" value={form.spdDcUp} onChange={(e) => set('spdDcUp', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Parafoudre DC — In (kA)</label>
            <input className="input" type="number" step="0.1" value={form.spdDcIn} onChange={(e) => set('spdDcIn', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Parafoudre DC — Iscpv (A)</label>
            <input className="input" type="number" step="0.1" value={form.spdDcIscpv} onChange={(e) => set('spdDcIscpv', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Uw (V)</label>
            <input className="input" type="number" value={form.dcProtUw} onChange={(e) => set('dcProtUw', e.target.value)} />
          </div>
        </div>

        <div className="form-section-title">Protections AC</div>
        <SectionScanner
          file={scans.protAc?.file ?? null}
          busy={scans.protAc?.busy ?? false}
          onFile={(f) => setScanFile('protAc', f)}
          onScan={() => handleScan('protAc')}
        />
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Disjoncteur — In (A)</label>
            <input className="input" type="number" step="0.1" value={form.acBreakerIn} onChange={(e) => set('acBreakerIn', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Sensibilité (mA)</label>
            <input className="input" type="number" value={form.acBreakerSensitivity} onChange={(e) => set('acBreakerSensitivity', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Parafoudre AC — Uc (V)</label>
            <input className="input" type="number" step="0.1" value={form.spdAcUc} onChange={(e) => set('spdAcUc', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Parafoudre AC — Up (V)</label>
            <input className="input" type="number" step="0.1" value={form.spdAcUp} onChange={(e) => set('spdAcUp', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Parafoudre AC — In (kA)</label>
            <input className="input" type="number" step="0.1" value={form.spdAcIn} onChange={(e) => set('spdAcIn', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Uw (V)</label>
            <input className="input" type="number" value={form.acProtUw} onChange={(e) => set('acProtUw', e.target.value)} />
          </div>
        </div>

        <div className="form-section-title">Câbles</div>
        <SectionScanner
          file={scans.cable?.file ?? null}
          busy={scans.cable?.busy ?? false}
          onFile={(f) => setScanFile('cable', f)}
          onScan={() => handleScan('cable')}
          showCableType
          cableType={cableType}
          onCableType={setCableType}
        />
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Câble DC — section (mm²)</label>
            <input className="input" type="number" step="0.1" value={form.dcCableSection} onChange={(e) => set('dcCableSection', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Câble DC — Iz (A)</label>
            <input className="input" type="number" value={form.dcCableIz} onChange={(e) => set('dcCableIz', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Câble DC — matériau</label>
            <input className="input" value={form.dcCableMaterial} onChange={(e) => set('dcCableMaterial', e.target.value)} placeholder="Cu / Al" />
          </div>
          <div className="form-group">
            <label className="form-label">Câble DC — isolant</label>
            <input className="input" value={form.dcCableInsulation} onChange={(e) => set('dcCableInsulation', e.target.value)} placeholder="PVC / PR / XLPE" />
          </div>
          <div className="form-group">
            <label className="form-label">Câble AC — section (mm²)</label>
            <input className="input" type="number" step="0.1" value={form.acCableSection} onChange={(e) => set('acCableSection', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Câble AC — Iz (A)</label>
            <input className="input" type="number" value={form.acCableIz} onChange={(e) => set('acCableIz', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Câble AC — matériau</label>
            <input className="input" value={form.acCableMaterial} onChange={(e) => set('acCableMaterial', e.target.value)} placeholder="Cu / Al" />
          </div>
          <div className="form-group">
            <label className="form-label">Câble AC — isolant</label>
            <input className="input" value={form.acCableInsulation} onChange={(e) => set('acCableInsulation', e.target.value)} placeholder="PVC / PR / XLPE" />
          </div>
        </div>

        <div className="form-section-title">Câblage du site</div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Longueur câble DC (m)</label>
            <input className="input" type="number" step="0.1" value={form.dcCableLength} onChange={(e) => set('dcCableLength', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Longueur câble AC (m)</label>
            <input className="input" type="number" step="0.1" value={form.acCableLength} onChange={(e) => set('acCableLength', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Phase AC</label>
            <select className="select" value={form.acPhase} onChange={(e) => set('acPhase', e.target.value as 'mono' | 'tri')}>
              <option value="mono">Monophasé (230 V)</option>
              <option value="tri">Triphasé (400 V)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Temp. ambiante min (°C)</label>
            <input className="input" type="number" value={form.tmin} onChange={(e) => set('tmin', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Temp. ambiante max (°C)</label>
            <input className="input" type="number" value={form.tmax} onChange={(e) => set('tmax', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Câbles DC regroupés</label>
            <input className="input" type="number" value={form.dcCableGrouping} onChange={(e) => set('dcCableGrouping', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Temp. câbles DC (°C)</label>
            <input className="input" type="number" value={form.dcCableTemp} onChange={(e) => set('dcCableTemp', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Câbles AC regroupés</label>
            <input className="input" type="number" value={form.acCableGrouping} onChange={(e) => set('acCableGrouping', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Temp. câbles AC (°C)</label>
            <input className="input" type="number" value={form.acCableTemp} onChange={(e) => set('acCableTemp', e.target.value)} />
          </div>
        </div>

        <div className="form-section-title">Structure & site</div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Hauteur support (m)</label>
            <input className="input" type="number" step="0.1" value={form.supportHeightM} onChange={(e) => set('supportHeightM', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Bras de levier (m)</label>
            <input className="input" type="number" step="0.1" value={form.ballastLeverM} onChange={(e) => set('ballastLeverM', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Ballast installé (kg)</label>
            <input className="input" type="number" value={form.ballastWeightKg} onChange={(e) => set('ballastWeightKg', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Vitesse vent (km/h)</label>
            <input className="input" type="number" value={form.windSpeedKmh} onChange={(e) => set('windSpeedKmh', e.target.value)} />
          </div>
        </div>

        {error && <div className="msg-box error mt-16">{error}</div>}

        <div className="flex gap-8 mt-16" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Annuler</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Création...' : 'Créer le dossier'}
          </button>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">🗂️ Équipements enregistrés (réutilisables)</h3>
        {catalog.length === 0 ? (
          <p className="card-subtitle">
            Aucun équipement enregistré pour le moment. Scannez une fiche technique dans la section du composant
            correspondant ci-dessus.
          </p>
        ) : (
          <ul style={{ listStyle: 'none' }}>
            {catalog.map((item) => (
              <li key={item._id} className="flex-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border, #eee)' }}>
                <div>
                  <strong>{item.brand || ''} {item.model || 'Sans modèle'}</strong>{' '}
                  <span className="badge badge-blue" style={{ marginLeft: 6 }}>
                    {CATEGORY_LABEL[item.category] || item.category}
                  </span>
                  {item.fileName && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.fileName}</div>}
                </div>
                <div className="flex gap-8">
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => handleUse(item)}>Utiliser</button>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => handleDeleteEquipment(item._id)}>Suppr.</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </form>
  );
}
