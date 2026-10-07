import { useEffect, useState } from 'react';
import { Icon } from '../Icon';
import type { ChecklistItemType, InstallationStage, StageChecklistItem } from '../../erpTypes';
import { countArtifact, isChecklistItemDone } from './helpers';

function TextItem({
  item, editable, onSave,
}: { item: StageChecklistItem; editable: boolean; onSave: (value: string) => void }) {
  const [val, setVal] = useState(item.value || '');
  useEffect(() => { setVal(item.value || ''); }, [item.value]);
  const commit = () => { if (val !== (item.value || '')) onSave(val); };
  const isLink = item.type === 'link';
  return (
    <input
      className="input inst-check-input"
      type={isLink ? 'url' : 'text'}
      placeholder={isLink ? 'https://… (lien)' : 'Saisir…'}
      value={val}
      disabled={!editable}
      onChange={(e) => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
    />
  );
}

export default function StageChecklist({
  stage, editable, onSaveItem, onAddArtifact,
}: {
  stage: InstallationStage;
  editable: boolean;
  onSaveItem: (key: string, patch: { value?: string; isDone?: boolean }) => void;
  onAddArtifact?: (stageNumber: number, type: ChecklistItemType) => void;
}) {
  if (!stage.checklist || stage.checklist.length === 0) {
    return <p className="inst-check-empty">Aucun élément de checklist pour cette étape.</p>;
  }
  return (
    <ul className="inst-checklist">
      {stage.checklist.map((item) => {
        const done = isChecklistItemDone(stage, item);
        const isArtifact = item.type === 'photo' || item.type === 'document';
        const have = countArtifact(stage, item);
        return (
          <li key={item.key} className={`inst-check-item ${done ? 'done' : ''}`}>
            <span className="inst-check-state">
              <Icon name={done ? 'check-circle' : 'chevron-right'} size={16} />
            </span>
            <div className="inst-check-main">
              <div className="inst-check-label">
                {item.label}
                {item.required && <span className="inst-req" title="Obligatoire"> *</span>}
              </div>

              {isArtifact ? (
                <div className="inst-check-artifact">
                  <span className={`inst-count ${done ? 'ok' : ''}`}>
                    <Icon name={item.type === 'photo' ? 'camera' : 'paperclip'} size={13} />
                    {have}/{item.minCount || 1}
                  </span>
                  {editable && onAddArtifact && (
                    <button
                      className="btn btn-ghost btn-sm inst-check-add"
                      onClick={() => onAddArtifact(stage.stageNumber, item.type)}
                    >
                      <Icon name="plus-circle" size={13} /> Ajouter
                    </button>
                  )}
                </div>
              ) : item.type === 'text' || item.type === 'link' ? (
                <TextItem item={item} editable={editable} onSave={(v) => onSaveItem(item.key, { value: v })} />
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
