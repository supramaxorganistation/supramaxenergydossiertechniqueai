import { useState } from 'react';
import { api } from '../api';
import type { Dossier } from '../types';

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
  panelAreaM2: string;
  panelWeightKg: string;
  inverterModel: string;
  inverterPower: string;
  dcCableLength: string;
  acCableLength: string;
  tmin: string;
  tmax: string;
  acPhase: 'mono' | 'tri';
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
  panelAreaM2: '2.58',
  panelWeightKg: '27.5',
  inverterModel: 'Growatt 3000S',
  inverterPower: '3',
  dcCableLength: '20',
  acCableLength: '10',
  tmin: '-10',
  tmax: '85',
  acPhase: 'mono',
  dcCableGrouping: '1',
  dcCableTemp: '50',
  acCableGrouping: '1',
  acCableTemp: '40',
  supportHeightM: '0.5',
  ballastLeverM: '0.6',
  ballastWeightKg: '0',
  windSpeedKmh: '130',
};

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

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

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
            <input
              className="input"
              value={form.customerName}
              onChange={(e) => set('customerName', e.target.value)}
              placeholder="Ex. Aziza Ajmi"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">CIN *</label>
            <input
              className="input"
              value={form.customerCin}
              onChange={(e) => set('customerCin', e.target.value)}
              placeholder="CIN du client"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Téléphone *</label>
            <input
              className="input"
              value={form.customerPhone}
              onChange={(e) => set('customerPhone', e.target.value)}
              placeholder="+216 ..."
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Réf. compteur STEG *</label>
            <input
              className="input"
              value={form.stegMeterRef}
              onChange={(e) => set('stegMeterRef', e.target.value)}
              placeholder="N° compteur"
              required
            />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Adresse *</label>
            <input
              className="input"
              value={form.customerAddress}
              onChange={(e) => set('customerAddress', e.target.value)}
              placeholder="Adresse de l'installation"
              required
            />
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">🔆 Système photovoltaïque</h3>
        <div className="form-section-title">Générateur PV</div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Puissance crête (kWc) *</label>
            <input
              className="input"
              type="number"
              step="0.1"
              value={form.peakPowerKwc}
              onChange={(e) => set('peakPowerKwc', e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Nombre de panneaux *</label>
            <input
              className="input"
              type="number"
              value={form.panelCount}
              onChange={(e) => set('panelCount', e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Marque panneau</label>
            <input
              className="input"
              value={form.panelBrand}
              onChange={(e) => set('panelBrand', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Modèle panneau</label>
            <input
              className="input"
              value={form.panelModel}
              onChange={(e) => set('panelModel', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Surface panneau (m²)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              value={form.panelAreaM2}
              onChange={(e) => set('panelAreaM2', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Poids panneau (kg)</label>
            <input
              className="input"
              type="number"
              step="0.1"
              value={form.panelWeightKg}
              onChange={(e) => set('panelWeightKg', e.target.value)}
            />
          </div>
        </div>

        <div className="form-section-title">Onduleur</div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Modèle onduleur *</label>
            <input
              className="input"
              value={form.inverterModel}
              onChange={(e) => set('inverterModel', e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Puissance AC (kW)</label>
            <input
              className="input"
              type="number"
              step="0.1"
              value={form.inverterPower}
              onChange={(e) => set('inverterPower', e.target.value)}
            />
          </div>
        </div>

        <div className="form-section-title">Câblage</div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Longueur câble DC (m)</label>
            <input
              className="input"
              type="number"
              step="0.1"
              value={form.dcCableLength}
              onChange={(e) => set('dcCableLength', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Longueur câble AC (m)</label>
            <input
              className="input"
              type="number"
              step="0.1"
              value={form.acCableLength}
              onChange={(e) => set('acCableLength', e.target.value)}
            />
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
            <input
              className="input"
              type="number"
              value={form.tmin}
              onChange={(e) => set('tmin', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Temp. ambiante max (°C)</label>
            <input
              className="input"
              type="number"
              value={form.tmax}
              onChange={(e) => set('tmax', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Câbles DC regroupés</label>
            <input
              className="input"
              type="number"
              value={form.dcCableGrouping}
              onChange={(e) => set('dcCableGrouping', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Temp. câbles DC (°C)</label>
            <input
              className="input"
              type="number"
              value={form.dcCableTemp}
              onChange={(e) => set('dcCableTemp', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Câbles AC regroupés</label>
            <input
              className="input"
              type="number"
              value={form.acCableGrouping}
              onChange={(e) => set('acCableGrouping', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Temp. câbles AC (°C)</label>
            <input
              className="input"
              type="number"
              value={form.acCableTemp}
              onChange={(e) => set('acCableTemp', e.target.value)}
            />
          </div>
        </div>

        <div className="form-section-title">Structure & site</div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Hauteur support (m)</label>
            <input
              className="input"
              type="number"
              step="0.1"
              value={form.supportHeightM}
              onChange={(e) => set('supportHeightM', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Bras de levier (m)</label>
            <input
              className="input"
              type="number"
              step="0.1"
              value={form.ballastLeverM}
              onChange={(e) => set('ballastLeverM', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Ballast installé (kg)</label>
            <input
              className="input"
              type="number"
              value={form.ballastWeightKg}
              onChange={(e) => set('ballastWeightKg', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Vitesse vent (km/h)</label>
            <input
              className="input"
              type="number"
              value={form.windSpeedKmh}
              onChange={(e) => set('windSpeedKmh', e.target.value)}
            />
          </div>
        </div>

        {error && <div className="msg-box error mt-16">{error}</div>}

        <div className="flex gap-8 mt-16" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Création...' : 'Créer le dossier'}
          </button>
        </div>
      </div>
    </form>
  );
}
