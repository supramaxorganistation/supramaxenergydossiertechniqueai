import { useRef, useState } from 'react';
import { Icon } from '../Icon';
import { fileUrl } from '../../api';
import type { InstallationStage } from '../../erpTypes';
import { formatDateTime, personName } from './helpers';

function formatBytes(n?: number): string {
  if (!n && n !== 0) return '';
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}

function docIcon(mime?: string): string {
  if (!mime) return 'file-text';
  if (mime.startsWith('image/')) return 'image';
  if (mime.includes('pdf')) return 'file-text';
  return 'paperclip';
}

export default function DocumentPanel({
  stage, onUpload, onDelete, canEdit, busy, checklistOptions = [],
}: {
  stage: InstallationStage;
  onUpload: (file: File, meta: { checklistKey?: string }) => Promise<void> | void;
  onDelete?: (docId: string) => void;
  canEdit?: boolean;
  busy?: boolean;
  checklistOptions?: { key: string; label: string }[];
}) {
  const [file, setFile] = useState<File | null>(null);
  const [checklistKey, setChecklistKey] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const docs = stage.documents || [];

  const submit = async () => {
    if (!file || !canEdit || busy) return;
    await onUpload(file, { checklistKey: checklistKey || undefined });
    setFile(null);
    setChecklistKey('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="inst-docs">
      {canEdit && (
        <div className="inst-uploader">
          <div className="file-drop" onClick={() => inputRef.current?.click()}>
            <Icon name="paperclip" size={20} />
            <div style={{ marginTop: 6 }}>{file ? file.name : 'Cliquez pour choisir un document (PDF, image, …)'}</div>
            <input
              ref={inputRef}
              type="file"
              hidden
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          {file && (
            <div className="inst-uploader-form">
              {checklistOptions.length > 0 && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Élément de checklist</label>
                  <select className="select" value={checklistKey} onChange={(e) => setChecklistKey(e.target.value)}>
                    <option value="">— Générique —</option>
                    {checklistOptions.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                  </select>
                </div>
              )}
              <div className="inst-uploader-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => setFile(null)} disabled={busy}>Retirer</button>
                <button className="btn btn-primary btn-sm" onClick={submit} disabled={busy}>
                  <Icon name="upload" size={14} /> {busy ? 'Envoi…' : 'Téléverser'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {docs.length === 0 ? (
        <p className="inst-check-empty">Aucun document pour cette étape.</p>
      ) : (
        <ul className="inst-doclist">
          {docs.map((d) => (
            <li key={d._id} className="inst-doc">
              <span className="inst-doc-icon"><Icon name={docIcon(d.mimeType)} size={16} /></span>
              <div className="inst-doc-main">
                <a href={fileUrl(d.url)} target="_blank" rel="noreferrer" className="inst-doc-name">{d.fileName || 'Document'}</a>
                <div className="inst-doc-meta">
                  {[formatBytes(d.size), personName(d.uploadedBy), formatDateTime(d.uploadedAt)].filter(Boolean).join(' · ')}
                </div>
              </div>
              <a className="icon-btn" href={fileUrl(d.url)} target="_blank" rel="noreferrer" aria-label="Télécharger"><Icon name="download" size={15} /></a>
              {canEdit && onDelete && (
                <button className="icon-btn" onClick={() => onDelete(d._id)} aria-label="Supprimer"><Icon name="x" size={15} /></button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
