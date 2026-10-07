import type { StageStatus } from '../../erpTypes';
import { STAGE_STATUS_META, stageMeta } from './helpers';

/** Colored pill for a stage's status. The dot uses the stage's own color. */
export default function StageBadge({ status, stageNumber }: { status: StageStatus; stageNumber?: number }) {
  const meta = STAGE_STATUS_META[status] || STAGE_STATUS_META.pending;
  const color = stageNumber ? stageMeta(stageNumber).color : 'currentColor';
  return (
    <span className={`badge badge-${meta.badge}`}>
      <span className="badge-dot" style={{ background: color }} />
      {meta.label}
    </span>
  );
}
