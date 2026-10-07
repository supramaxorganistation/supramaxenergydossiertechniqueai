import type { ErpInstallation } from '../../erpTypes';
import { INSTALLATION_STAGES } from '../../erpTypes';
import ProgressBar from './ProgressBar';
import { isLate } from './helpers';
import { Icon } from '../Icon';

export default function KanbanBoard({
  installations, onOpen,
}: {
  installations: ErpInstallation[];
  onOpen: (id: string) => void;
}) {
  return (
    <div className="inst-kanban">
      {INSTALLATION_STAGES.map((s) => {
        const col = installations.filter((i) => (i.currentStage || 1) === s.number && i.status !== 'cancelled');
        return (
          <div key={s.number} className="inst-kanban-col">
            <div className="inst-kanban-head" style={{ ['--stage-color' as string]: s.color }}>
              <span className="inst-kanban-num">{s.number}</span>
              <span className="inst-kanban-title" title={s.label}>{s.label}</span>
              <span className="inst-kanban-count">{col.length}</span>
            </div>
            <div className="inst-kanban-cards">
              {col.map((inst) => {
                const late = isLate(inst.targetEndDate, inst.status);
                return (
                  <button key={inst._id} className="inst-kanban-card" onClick={() => onOpen(inst._id)}>
                    <div className="inst-kanban-cardtop">
                      <span className="inst-kanban-ref">{inst.reference}</span>
                      <span className="inst-kanban-cardflags">
                        {inst.isBlocked && <Icon name="alert-triangle" size={13} className="flag-red" />}
                        {late && <Icon name="clock" size={13} className="flag-amber" />}
                      </span>
                    </div>
                    <div className="inst-kanban-customer">{inst.customerName || 'Client'}</div>
                    <div className="inst-kanban-insttitle">{inst.title}</div>
                    <ProgressBar value={inst.progress || 0} height={5} showLabel={false} />
                  </button>
                );
              })}
              {col.length === 0 && <div className="inst-kanban-empty">—</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
