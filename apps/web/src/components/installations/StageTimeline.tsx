import { useEffect, useState } from 'react';
import type { ChecklistItemType, InstallationStage, InstallationStatus } from '../../erpTypes';
import StageCard from './StageCard';
import { canEditStage } from './helpers';

export default function StageTimeline({
  stages, currentStage, status, role, isAdmin, busy,
  onStart, onComplete, onBlock, onUnblock, onSaveItem, onAddArtifact,
}: {
  stages: InstallationStage[];
  currentStage: number;
  status?: InstallationStatus;
  role?: string;
  isAdmin: boolean;
  busy?: boolean;
  onStart: (n: number) => void;
  onComplete: (n: number, opts: { adminOverride?: boolean }) => void;
  onBlock: (n: number) => void;
  onUnblock: (n: number) => void;
  onSaveItem: (n: number, key: string, patch: { value?: string; isDone?: boolean }) => void;
  onAddArtifact?: (n: number, type: ChecklistItemType) => void;
}) {
  const [open, setOpen] = useState<Set<number>>(new Set([currentStage]));
  useEffect(() => { setOpen(new Set([currentStage])); }, [currentStage]);

  const toggle = (n: number) => setOpen((prev) => {
    const next = new Set(prev);
    if (next.has(n)) next.delete(n); else next.add(n);
    return next;
  });

  const isActive = status === 'active';

  return (
    <ol className="inst-timeline">
      {stages.map((stage) => {
        const isCurrent = stage.stageNumber === currentStage;
        const editable = isActive && isCurrent && stage.status !== 'done' && canEditStage(role, stage.stageNumber);
        return (
          <StageCard
            key={stage.stageNumber}
            stage={stage}
            isCurrent={isCurrent}
            editable={editable}
            isAdmin={isAdmin}
            expanded={open.has(stage.stageNumber)}
            onToggle={() => toggle(stage.stageNumber)}
            busy={busy}
            onStart={onStart}
            onComplete={onComplete}
            onBlock={onBlock}
            onUnblock={onUnblock}
            onSaveItem={onSaveItem}
            onAddArtifact={onAddArtifact}
          />
        );
      })}
    </ol>
  );
}
