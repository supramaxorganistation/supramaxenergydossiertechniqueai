import { useEffect, useState } from 'react';
import { erpApi } from '../erpApi';
import type { ErpSetting } from '../erpTypes';

type SettingsForm = Record<string, Record<string, any>>;

const CATEGORIES = [
  { key: 'company', label: 'Company Info', icon: '🏢' },
  { key: 'general', label: 'General', icon: '⚙️' },
  { key: 'invoice', label: 'Invoice', icon: '📄' },
  { key: 'quote', label: 'Quote', icon: '📝' },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<ErpSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('company');
  const [form, setForm] = useState<SettingsForm>({});
  const [saving, setSaving] = useState(false);
  const [seeded, setSeeded] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await erpApi.listSettings();
      setSettings(data);
      // Build form from settings
      const f: SettingsForm = {};
      data.forEach(s => {
        if (!f[s.category]) f[s.category] = {};
        f[s.category][s.key] = s.value;
      });
      setForm(f);
      if (data.length > 0) setSeeded(true);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSeed = async () => {
    try { await erpApi.seedSettings(); await load(); } catch (err: any) { alert(err.message); }
  };

  const handleChange = (category: string, key: string, value: any) => {
    setForm(prev => ({ ...prev, [category]: { ...prev[category], [key]: value } }));
  };

  const handleSave = async (category: string) => {
    setSaving(true);
    try {
      const catSettings = settings.filter(s => s.category === category);
      const updates = catSettings.map(s => ({
        category: s.category,
        key: s.key,
        value: form[category]?.[s.key] ?? s.value,
        label: s.label,
        description: s.description,
        valueType: s.valueType,
      }));
      await erpApi.bulkUpdateSettings(updates);
      alert('Settings saved!');
    } catch (err: any) { alert(err.message); }
    setSaving(false);
  };

  const categorySettings = (category: string) => settings.filter(s => s.category === category);

  if (loading) return <div className="loading-screen"><span className="spinner" /> Loading settings...</div>;

  if (!seeded && settings.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚙️</div>
        <h3>No settings configured yet</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>Seed default settings to get started.</p>
        <button className="btn btn-primary" onClick={handleSeed}>Seed Default Settings</button>
      </div>
    );
  }

  return (
    <>
      <div className="tabs mb-16">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            className={`tab ${activeTab === cat.key ? 'active' : ''}`}
            onClick={() => setActiveTab(cat.key)}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {CATEGORIES.filter(c => c.key === activeTab).map(cat => {
        const items = categorySettings(cat.key);
        return (
          <div key={cat.key} className="card">
            <h4 className="card-title">{cat.icon} {cat.label} Settings</h4>
            <div className="form-grid">
              {items.map(s => (
                <div className="form-group" key={s.key}>
                  <label className="form-label">{s.label || s.key}</label>
                  {s.description && <small style={{ display: 'block', color: 'var(--text-muted)', marginBottom: 4 }}>{s.description}</small>}
                  {s.valueType === 'boolean' ? (
                    <select
                      className="select"
                      value={String(form[cat.key]?.[s.key] ?? s.value)}
                      onChange={e => handleChange(cat.key, s.key, e.target.value === 'true')}
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  ) : s.valueType === 'number' ? (
                    <input
                      className="input"
                      type="number"
                      value={form[cat.key]?.[s.key] ?? s.value}
                      onChange={e => handleChange(cat.key, s.key, +e.target.value)}
                    />
                  ) : (
                    <input
                      className="input"
                      type="text"
                      value={form[cat.key]?.[s.key] ?? s.value}
                      onChange={e => handleChange(cat.key, s.key, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
            {items.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <button className="btn btn-primary" onClick={() => handleSave(cat.key)} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
            {items.length === 0 && (
              <p style={{ color: 'var(--text-muted)' }}>No settings in this category yet.</p>
            )}
          </div>
        );
      })}
    </>
  );
}
                                                        