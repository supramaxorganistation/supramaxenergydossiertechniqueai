import { Icon } from '../Icon';
import type { InstallationEvent } from '../../erpTypes';
import { formatDateTime, personName } from './helpers';

const EVENT_META: Record<string, { icon: string; className: string }> = {
  installation_created: { icon: 'plus-circle', className: 'ev-blue' },
  installation_updated: { icon: 'pen', className: 'ev-gray' },
  installation_cancelled: { icon: 'x', className: 'ev-red' },
  stage_started: { icon: 'chevron-right', className: 'ev-blue' },
  stage_completed: { icon: 'check-circle', className: 'ev-green' },
  stage_blocked: { icon: 'alert-triangle', className: 'ev-red' },
  stage_unblocked: { icon: 'refresh', className: 'ev-amber' },
  admin_override: { icon: 'shield', className: 'ev-amber' },
  photo_added: { icon: 'camera', className: 'ev-green' },
  photo_removed: { icon: 'camera', className: 'ev-gray' },
  document_added: { icon: 'paperclip', className: 'ev-green' },
  document_removed: { icon: 'paperclip', className: 'ev-gray' },
};

export default function EventLog({ events }: { events: InstallationEvent[] }) {
  if (!events || events.length === 0) {
    return <p className="inst-check-empty">Aucune activité enregistrée pour le moment.</p>;
  }
  return (
    <ol className="inst-eventlog">
      {events.map((ev, i) => {
        const meta = EVENT_META[ev.type] || { icon: 'inbox', className: 'ev-gray' };
        return (
          <li key={ev._id || i} className="inst-event">
            <span className={`inst-event-icon ${meta.className}`}><Icon name={meta.icon} size={14} /></span>
            <div className="inst-event-main">
              <div className="inst-event-msg">
                {ev.message || ev.type}
                {ev.stageNumber ? <span className="inst-event-stage"> · Étape {ev.stageNumber}</span> : null}
              </div>
              <div className="inst-event-meta">
                {personName(ev.userId) || ev.userName || 'Système'} · {formatDateTime(ev.createdAt)}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
