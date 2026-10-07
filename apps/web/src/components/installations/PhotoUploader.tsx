import { useRef, useState } from 'react';
import { Icon } from '../Icon';

export default function PhotoUploader({
  onUpload, busy, disabled, checklistOptions = [],
}: {
  onUpload: (files: File[], meta: { checklistKey?: string; caption?: string }) => Promise<void> | void;
  busy?: boolean;
  disabled?: boolean;
  checklistOptions?: { key: string; label: string }[];
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState('');
  const [checklistKey, setChecklistKey] = useState('');
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const imgs = Array.from(list).filter((f) => f.type.startsWith('image/'));
    if (imgs.length) setFiles((prev) => [...prev, ...imgs]);
  };

  const reset = () => {
    setFiles([]);
    setCaption('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const submit = async () => {
    if (!files.length || disabled || busy) return;
    await onUpload(files, { checklistKey: checklistKey || undefined, caption: caption || undefined });
    reset();
  };

  return (
    <div className="inst-uploader">
      <div
        className={`file-drop ${drag ? 'has-file' : ''} ${files.length ? 'has-file' : ''}`}
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); if (!disabled) addFiles(e.dataTransfer.files); }}
      >
        <Icon name="camera" size={22} />
        <div style={{ marginTop: 6 }}>
          {disabled
            ? 'Ajout de photos non autorisé pour cette étape'
            : files.length
              ? `${files.length} photo(s) sélectionnée(s) — cliquez pour en ajouter`
              : 'Glissez des photos ici ou cliquez pour sélectionner'}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          hidden
          disabled={disabled}
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className="inst-uploader-form">
          {checklistOptions.length > 0 && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Élément de checklist</label>
              <select className="select" value={checklistKey} onChange={(e) => setChecklistKey(e.target.value)} disabled={disabled}>
                <option value="">— Générique —</option>
                {checklistOptions.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
            </div>
          )}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Légende (optionnel)</label>
            <input className="input" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Ex. Face sud des panneaux" disabled={disabled} />
          </div>
          <div className="inst-uploader-actions">
            <button className="btn btn-ghost btn-sm" onClick={reset} disabled={busy || disabled}>Retirer</button>
            <button className="btn btn-primary btn-sm" onClick={submit} disabled={busy || disabled}>
              <Icon name="upload" size={14} /> {busy ? 'Envoi…' : 'Téléverser'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
