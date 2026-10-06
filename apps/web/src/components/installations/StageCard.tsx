import { useState } from 'react';
import { Icon } from '../Icon';
import type { ChecklistItemType, InstallationStage } from '../../erpTypes';
import StageBadge from './StageBadge';
import StageChecklist from './StageChecklist';
import {
  stageMeta, formatDate, personName,
  isStageChecklistComplete, getMissingChecklistItems,
} from './helpers';

export default function StageCard({
  stage, isCurrent, editable, isAdmin, expanded, onToggle, busy,
  onStart, onComplete, onBlock, onUnblock, onSaveItem, onAddArtifact,
}: {
  stage: InstallationStage;
  isCurrent: boolean;
  editable: boolean;
  isAdmin: boolean;
  expanded: boolean;
  onToggle: () => void;
  busy?: boolean;
  onStart: (n: number) => void;
  onComplete: (n: number, opts: { adminOverride?: boolean }) => void;
  onBlock: (n: number) => void;
  onUnblock: (n: number) => void;
  onSaveItem: (n: number, key: string, patch: { value?: string; isDone?: boolean }) => void;
  onAddArtifact?: (n: number, type: ChecklistItemType) => void;
}) {
  const meta = stageMeta(stage.stageNumber);
  const complete = isStageChecklistComplete(stage);
  const missing = getMissingChecklistItems(stage);
  const done = stage.status === 'done';
  const blocked = stage.status === 'blocked';
  const actionable = editable && !done && isCurrent;
  const [confirmForce, setConfirmForce] = useState(false);

  const statusClass = done ? 'done' : blocked ? 'blocked' : isCurrent ? 'current' : 'pending';

  return (
    <li className={`inst-stage ${statusClass}`}>
      <div className="inst-stage-marker" style={{ ['--stage-color' as string]: meta.color }}>
        <span className="inst-stage-dot">
          <Icon name={done ? 'check' : blocked ? 'alert-triangle' : meta.icon} size={15} />
        </span>
      </div>

      <div className="inst-stage-body">
        <button className="inst-stage-head" onClick={onToggle} aria-expanded={expanded}>
          <div className="inst-stage-head-main">
            <span className="inst-stage-num">Étape {stage.stageNumber}</span>
            <span className="inst-stage-title">{meta.label}</span>
            <StageBadge status={stage.status} stageNumber={stage.stageNumber} />
          </div>
          <div className="inst-stage-head-side">
            {done && <span className="inst-stage-date">{formatDate(stage.completedAt)} · {personName(stage.completedBy)}</span>}
            {!done && stage.startedAt && <span className="inst-stage-date">Démarrée le {formatDate(stage.startedAt)}</span>}
            <Icon name={expanded ? 'chevron-down' : 'chevron-right'} size={16} />
          </div>
        </button>

        {expanded && (
          <div className="inst-stage-content">
            {blocked && stage.blockedReason && (
              <div className="inst-alert inst-alert-red">
                <Icon name="alert-triangle" size={15} /> Bloquée : {stage.blockedReason}
              </div>
            )}

            <StageChecklist stage={stage} editable={editable && !done} onSaveItem={(key, patch) => onSaveItem(stage.stageNumber, key, patch)} onAddArtifact={onAddArtifact} />

            {!complete && !done && missing.length > 0 && (
              <p className="inst-why">
                <Icon name="alert-triangle" size={13} />
                Validation impossible : {missing.length} élément(s) obligatoire(s) incomplet(s)
                {isAdmin && ' — un administrateur peut forcer la validation.'}
              </p>
            )}

            {actionable && (
              <div className="inst-stage-actions">
                {stage.status === 'pending' && (
                  <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onStart(stage.stageNumber)}>
                    <Icon name="chevron-right" size={14} /> Démarrer
                  </button>
                )}

                {complete ? (
                  <button className="btn btn-success btn-sm" disabled={busy} onClick={() => onComplete(stage.stageNumber, {})}>
                    <Icon name="check-circle" size={14} /> Valider l’étape
                  </button>
                ) : isAdmin ? (
                  confirmForce ? (
                    <button className="btn btn-warning btn-sm" disabled={busy} onClick={() => { setConfirmForce(false); onComplete(stage.stageNumber, { adminOverride: true }); }}>
                      <Icon name="alert-triangle" size={14} /> Confirmer le forçage
                    </button>
                  ) : (
                    <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setConfirmForce(true)}>
                      <Icon name="shield" size={14} /> Forcer (admin)
                    </button>
                  )
                ) : (
                  <button className="btn btn-success btn-sm" disabled title="Checklist incomplète">
                    <Icon name="check-circle" size={14} /> Valider l’étape
                  </button>
                )}

                {blocked ? (
                  <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onUnblock(stage.stageNumber)}>
                    <Icon name="refresh" size={14} /> Débloquer
                  </button>
                ) : (
                  <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onBlock(stage.stageNumber)}>
                    <Icon name="alert-triangle" size={14} /> Bloquer
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
