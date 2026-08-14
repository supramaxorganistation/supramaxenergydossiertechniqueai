import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import type { Dossier, TemplateVariable } from '../types';

/**
 * Variables du document — lets the user override any {{placeholder}} of the
 * DOCX template (template-safe-placeholders.docx). Values are merged over
 * the computed dossier values at DOCX/PDF generation time. Narrative keys
 * (✨) can be auto-generated in French by AI.
 */
export default function VariablesPanel({
  dossier,
  canManage,
  onSaved,
}: {
  dossier: Dossier;
  canManage: boolean;
  onSaved: () => Promise<void>;
}) {
  const [catalog, setCatalog] = useState<TemplateVariable[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [logoUrl, setLogoUrl] = useState('');

  // Installer logo preview (file variable: server/assets/logo.png)
  useEffect(() => {
    let cancelled = false;
    let url = '';
    api
      .brandingLogo()
      .then(({ blob }) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setLogoUrl(url);
      })
      .catch(() => { /* logo optionnel */ });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .templateVariables()
      .then((list) => {
        if (cancelled) return;
        setCatalog(list);
        setOpenGroups((prev) => {
          const next = { ...prev };
          for (const g of ['Page de garde', 'Introduction', 'Descriptions des protections', 'Câblage & structure', 'Annexes']) {
            if (!(g in next)) next[g] = true;
          }
          return next;
        });
      })
      .catch(() => setNotice('Impossible de charger la liste des variables.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setValues(dossier.variables || {});
    setDirty(false);
  }, [dossier._id, dossier.variables]);

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? catalog.filter((v) => v.label.toLowerCase().includes(q) || v.key.toLowerCase().includes(q))
      : catalog;
    const byGroup = new Map<string, TemplateVariable[]>();
    for (const v of filtered) {
      const list = byGroup.get(v.group) || [];
      list.push(v);
      byGroup.set(v.group, list);
    }
    return byGroup;
  }, [catalog, search]);

  const setValue = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const filledCount = useMemo(
    () => Object.values(values).filter((v) => v.trim() !== '').length,
    [values]
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    setNotice('');
    try {
      const clean: Record<string, string> = {};
      for (const [k, v] of Object.entries(values)) {
        if (v.trim() !== '') clean[k] = v;
      }
      await api.updateDossier(dossier._id, { variables: clean });
      setDirty(false);
      setNotice('Variables enregistrées. Elles seront utilisées à la génération DOCX / PDF.');
      await onSaved();
    } catch (err: any) {
      setNotice(`Erreur : ${err.message}`);
    } finally {
      setSaving(false);
    }
  }, [values, dossier._id, onSaved]);

  const handleAiGenerate = useCallback(async () => {
    setGenerating(true);
    setNotice('');
    try {
      const { texts } = await api.aiTexts(dossier._id);
      if (Object.keys(texts).length === 0) {
        setNotice('Les textes IA sont déjà définis dans vos variables.');
        return;
      }
      setValues((prev) => ({ ...prev, ...texts }));
      setDirty(true);
      setNotice(
        `Textes générés par IA : ${Object.keys(texts).join(', ')}. Vérifiez puis enregistrez.`
      );
    } catch (err: any) {
      setNotice(`Erreur IA : ${err.message}`);
    } finally {
      setGenerating(false);
    }
  }, [dossier._id]);

  if (loading) {
    return (
      <div className="loading-screen" style={{ minHeight: 200 }}>
        <span className="spinner" />
        Chargement des variables du modèle...
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <div className="vars-toolbar">
          <div>
            <h4 className="card-title">📝 Variables du document</h4>
            <p className="card-subtitle">
              Remplacez n'importe quelle balise {'{{variable}}'} du modèle Word officiel.
              Les champs ✨ peuvent être rédigés automatiquement en français par l'IA.
              {filledCount > 0 && <strong> {filledCount} variable(s) définie(s).</strong>}
            </p>
          </div>
          <div className="flex gap-8">
            <input
              className="vars-search"
              placeholder="🔍 Rechercher une variable..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              className="btn btn-outline"
              onClick={handleAiGenerate}
              disabled={generating || !canManage}
              title="Génère en français les textes narratifs (introduction, descriptions…)"
            >
              {generating ? '⏳ Génération...' : '✨ Générer les textes par IA'}
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !dirty || !canManage}>
              {saving ? 'Enregistrement...' : '💾 Enregistrer'}
            </button>
          </div>
        </div>
        {notice && (
          <div className="msg-box info mt-12" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{notice}</span>
            <button className="icon-btn" onClick={() => setNotice('')}>✕</button>
          </div>
        )}
      </div>

      <div className="card vars-logo-card">
        <div className="vars-logo-box">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo installateur" className="vars-logo-img" />
          ) : (
            <span className="vars-logo-missing">Aucun logo</span>
          )}
        </div>
        <div>
          <h4 className="card-title">🖼️ Logo installateur</h4>
          <p className="card-subtitle">
            Placé sur chaque page, au-dessus de « Sigle installateur ».
            Pour le changer, remplacez manuellement le fichier{' '}
            <code>server/assets/logo.png</code> (ou logo.jpg) — pris en compte à la
            prochaine exportation, sans redémarrage.
          </p>
        </div>
      </div>

      {[...groups.entries()].map(([group, vars]) => {
        const open = search.trim() !== '' || !!openGroups[group];
        const groupFilled = vars.filter((v) => (values[v.key] || '').trim() !== '').length;
        return (
          <div className="card vars-group" key={group}>
            <button
              className="vars-group-head"
              onClick={() => setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }))}
            >
              <span className="vars-chevron">{open ? '▾' : '▸'}</span>
              <span style={{ fontWeight: 600 }}>{group}</span>
              <span className="vars-count">
                {groupFilled > 0 ? `${groupFilled}/${vars.length} définies` : `${vars.length} variables`}
              </span>
            </button>
            {open && (
              <div className="vars-grid">
                {vars.map((v) => {
                  const hasValue = (values[v.key] || '').trim() !== '';
                  return (
                    <div className={`var-field ${v.long ? 'var-long' : ''}`} key={v.key}>
                      <label className="var-label">
                        {v.ai && <span className="var-ai" title="Peut être généré par IA">✨ </span>}
                        {v.label}
                        {hasValue && <span className="var-dot" title="Définie">●</span>}
                      </label>
                      {v.long ? (
                        <textarea
                          className="var-textarea"
                          rows={3}
                          value={values[v.key] || ''}
                          placeholder={`{{${v.key}}}`}
                          disabled={!canManage}
                          onChange={(e) => setValue(v.key, e.target.value)}
                        />
                      ) : (
                        <input
                          className="var-input"
                          value={values[v.key] || ''}
                          placeholder={`{{${v.key}}}`}
                          disabled={!canManage}
                          onChange={(e) => setValue(v.key, e.target.value)}
                        />
                      )}
                      <span className="var-code">{'{{' + v.key + '}}'}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
