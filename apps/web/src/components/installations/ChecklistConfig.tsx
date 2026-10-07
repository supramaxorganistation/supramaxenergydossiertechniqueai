import { useEffect, useState } from 'react';
import { erpApi } from '../../erpApi';
import type { ChecklistConfigItem, ChecklistStageConfig, ChecklistItemType } from '../../erpTypes';
import { Icon } from '../Icon';
import { Badge, EmptyState } from '../ui';
import { stageMeta } from './helpers';

const TYPE_LABEL: Record<ChecklistItemType, string> = {
  photo: 'Photo', document: 'Document', text: 'Texte', link: 'Lien',
};

function slugify(v: string) {
  return v.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
}

const blankItem = (): ChecklistConfigItem => ({ key: '', label: '', type: 'photo', required: true, minCount: 1 });

export default function ChecklistConfig() {
  const [stages, setStages] = useState<ChecklistStageConfig[]>([]);
  const [draft, setDraft] = useState<Record<string, ChecklistConfigItem[]>>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [itemTypes, setItemTypes] = useState<ChecklistItemType[]>(['photo', 'document', 'text', 'link']);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await erpApi.getChecklistsConfig();
        setStages(res.stages);
        setItemTypes(res.itemTypes as ChecklistItemType[]);
        const d: Record<string, ChecklistConfigItem[]> = {};
        res.stages.forEach((s) => { d[s.code] = s.items.map((i) => ({ ...i })); });
        setDraft(d);
      } catch (err) {
        setNotice(`Erreur : ${err instanceof Error ? err.message : 'chargement impossible'}`);
      } finally { setLoading(false); }
    })();
  }, []);

  const applyResponse = (res: { stages: ChecklistStageConfig[] }) => {
    setStages(res.stages);
    setDraft((prev) => {
      const next = { ...prev };
      res.stages.forEach((s) => { next[s.code] = s.items.map((i) => ({ ...i })); });
      return next;
    });
  };

  const editItem = (code: string, idx: number, patch: Partial<ChecklistConfigItem>) => {
    setDraft((prev) => {
      const list = [...(prev[code] || [])];
      list[idx] = { ...list[idx], ...patch };
      return { ...prev, [code]: list };
    });
    setDirty((p) => ({ ...p, [code]: true }));
  };

  const addItem = (code: string) => {
    setDraft((prev) => ({ ...prev, [code]: [...(prev[code] || []), blankItem()] }));
    setDirty((p) => ({ ...p, [code]: true }));
    setOpen((p) => ({ ...p, [code]: true }));
  };

  const removeItem = (code: string, idx: number) => {
    setDraft((prev) => ({ ...prev, [code]: (prev[code] || []).filter((_, i) => i !== idx) }));
    setDirty((p) => ({ ...p, [code]: true }));
  };

  const save = async (code: string) => {
    const items = (draft[code] || []).map((i) => ({ ...i, key: slugify(i.key) })).filter((i) => i.key && i.label.trim());
    if (new Set(items.map((i) => i.key)).size !== items.length) { setNotice('Des clés sont dupliquées ou vides.'); return; }
    setBusy(code);
    try {
      const res = await erpApi.saveChecklistsConfig({ [code]: items });
      applyResponse(res);
      setDirty((p) => ({ ...p, [code]: false }));
      setNotice(`Checklist « ${stageLabel(code)} » enregistrée. S’applique aux nouvelles installations.`);
    } catch (err) {
      setNotice(`Erreur : ${err instanceof Error ? err.message : 'enregistrement impossible'}`);
    } finally { setBusy(null); }
  };

  const reset = async (code: string) => {
    if (!window.confirm(`Réinitialiser la checklist « ${stageLabel(code)} » aux valeurs par défaut ?`)) return;
    setBusy(code);
    try {
      const res = await erpApi.saveChecklistsConfig({ [code]: null });
      applyResponse(res);
      setDirty((p) => ({ ...p, [code]: false }));
      setNotice(`Checklist « ${stageLabel(code)} » réinitialisée.`);
    } catch (err) {
      setNotice(`Erreur : ${err instanceof Error ? err.message : 'réinitialisation impossible'}`);
    } finally { setBusy(null); }
  };

  const stageLabel = (code: string) => stages.find((s) => s.code === code)?.label || code;

  if (loading) return <div className="loading-screen"><span className="spinner" /> Chargement…</div>;

  return (
    <>
      {notice && (
        <div className="msg-box info mb-16" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{notice}</span>
          <button className="icon-btn" onClick={() => setNotice('')} aria-label="Fermer"><Icon name="x" size={13} /></button>
        </div>
      )}

      <div className="msg-box warn mb-16">
        <Icon name="alert-triangle" size={15} />
        <span>La personnalisation s’applique uniquement aux <strong>nouvelles</strong> installations. Les chantiers existants conservent leur checklist.</span>
      </div>

      {stages.length === 0 ? <EmptyState icon="inbox" title="Aucune étape" /> : (
        <div className="inst-cfg-list">
          {stages.map((s) => {
            const items = draft[s.code] || [];
            const meta = stageMeta(s.number);
            const isOpen = !!open[s.code];
            return (
              <div key={s.code} className="inst-cfg-stage">
                <button className="inst-cfg-head" onClick={() => setOpen((p) => ({ ...p, [s.code]: !p[s.code] }))}>
                  <span className="inst-cfg-num" style={{ background: meta.color }}>{s.number}</span>
                  <span className="inst-cfg-title">{s.label}</span>
                  {s.customized && <Badge color="blue">Personnalisée</Badge>}
                  {dirty[s.code] && <Badge color="amber">Modifiée</Badge>}
                  <span className="inst-cfg-count">{items.length} élément(s)</span>
                  <Icon name={isOpen ? 'chevron-down' : 'chevron-right'} size={15} />
                </button>

                {isOpen && (
                  <div className="inst-cfg-body">
                    {items.length === 0 && <p className="form-hint">Aucun élément de vérification pour cette étape.</p>}
                    {items.map((it, idx) => (
                      <div key={idx} className="inst-cfg-item">
                        <input className="input inst-cfg-key" placeholder="cle" value={it.key}
                          onChange={(e) => editItem(s.code, idx, { key: e.target.value })}
                          onBlur={(e) => editItem(s.code, idx, { key: slugify(e.target.value) })} />
                        <input className="input inst-cfg-label" placeholder="Libellé" value={it.label}
                          onChange={(e) => editItem(s.code, idx, { label: e.target.value })} />
                        <select className="select inst-cfg-type" value={it.type}
                          onChange={(e) => editItem(s.code, idx, { type: e.target.value as ChecklistItemType })}>
                          {itemTypes.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                        </select>
                        {(it.type === 'photo' || it.type === 'document') && (
                          <input className="input inst-cfg-min" type="number" min={1} value={it.minCount}
                            onChange={(e) => editItem(s.code, idx, { minCount: Math.max(1, Number(e.target.value) || 1) })}
                            title="Nombre minimum" />
                        )}
                        <label className="inst-check"><input type="checkbox" checked={it.required}
                          onChange={(e) => editItem(s.code, idx, { required: e.target.checked })} /> Requis</label>
                        <button className="icon-btn" onClick={() => removeItem(s.code, idx)} title="Supprimer" aria-label="Supprimer">
                          <Icon name="x" size={14} />
                        </button>
                      </div>
                    ))}

                    <div className="inst-cfg-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => addItem(s.code)}><Icon name="plus-circle" size={14} /> Ajouter un élément</button>
                      <span className="flex-grow" />
                      <button className="btn btn-ghost btn-sm" onClick={() => reset(s.code)} disabled={busy === s.code || !s.customized}>Réinitialiser</button>
                      <button className="btn btn-primary btn-sm" onClick={() => save(s.code)} disabled={busy === s.code || !dirty[s.code]}>
                        {busy === s.code ? 'Enregistrement…' : 'Enregistrer'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
