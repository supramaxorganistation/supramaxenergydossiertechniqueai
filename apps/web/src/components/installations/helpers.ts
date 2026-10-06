import {
  INSTALLATION_STAGES,
  type InstallationStage,
  type StageChecklistItem,
  type StageStatus,
  type InstallationStatus,
  type MissingChecklistItem,
} from '../../erpTypes';

/** Stage definition lookup by 1-based number. */
export function stageMeta(n: number) {
  return INSTALLATION_STAGES.find((s) => s.number === n) || INSTALLATION_STAGES[0];
}

export const STAGE_STATUS_META: Record<StageStatus, { label: string; badge: 'gray' | 'blue' | 'green' | 'red' | 'amber' }> = {
  pending: { label: 'À venir', badge: 'gray' },
  in_progress: { label: 'En cours', badge: 'blue' },
  done: { label: 'Terminée', badge: 'green' },
  blocked: { label: 'Bloquée', badge: 'red' },
};

export const INSTALLATION_STATUS_META: Record<InstallationStatus, { label: string; badge: 'gray' | 'blue' | 'green' | 'red' | 'amber' }> = {
  active: { label: 'Active', badge: 'blue' },
  completed: { label: 'Terminée', badge: 'green' },
  cancelled: { label: 'Annulée', badge: 'red' },
};

export const SYSTEM_TYPE_LABEL: Record<string, string> = {
  on_grid: 'Raccordé au réseau',
  hybrid: 'Hybride',
  off_grid: 'Site isolé',
};

/** Mirrors server STAGE_ROLE_ACCESS: admin = all, technician = field stages. */
const STAGE_ROLE_ACCESS: Record<string, number[]> = {
  admin: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  technician: [3, 6, 7, 9],
};

export function canEditStage(role: string | undefined, stageNumber: number): boolean {
  if (!role) return false;
  const allowed = STAGE_ROLE_ACCESS[role];
  return !!allowed && allowed.includes(stageNumber);
}

function countArtifactsForItem(stage: InstallationStage, item: StageChecklistItem): number {
  if (item.type === 'photo') {
    return (stage.photos || []).filter((p) => !item.key || !p.checklistKey || p.checklistKey === item.key).length;
  }
  if (item.type === 'document') {
    const matched = (stage.documents || []).filter((d) => d.checklistKey === item.key);
    if (matched.length) return matched.length;
    return (stage.documents || []).filter((d) => d.type === item.key).length;
  }
  return 0;
}

export function isChecklistItemDone(stage: InstallationStage, item: StageChecklistItem): boolean {
  if (!item.required) return true;
  if (item.type === 'photo' || item.type === 'document') {
    return countArtifactsForItem(stage, item) >= (item.minCount || 1);
  }
  return !!(item.value && String(item.value).trim()) || item.isDone === true;
}

export function isStageChecklistComplete(stage: InstallationStage): boolean {
  return (stage.checklist || []).every((item) => isChecklistItemDone(stage, item));
}

export function getMissingChecklistItems(stage: InstallationStage): MissingChecklistItem[] {
  return (stage.checklist || [])
    .filter((item) => item.required && !isChecklistItemDone(stage, item))
    .map((item) => {
      if (item.type === 'photo' || item.type === 'document') {
        return { key: item.key, label: item.label, type: item.type, need: item.minCount || 1, have: countArtifactsForItem(stage, item) };
      }
      return { key: item.key, label: item.label, type: item.type, need: 1, have: 0 };
    });
}

export function countArtifact(stage: InstallationStage, item: StageChecklistItem): number {
  return countArtifactsForItem(stage, item);
}

// ---- Date formatting: fr-TN, Africa/Tunis ----
const TZ = 'Africa/Tunis';

export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-TN', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return '—'; }
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fr-TN', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}

/** True when targetEndDate is passed and the installation is still active. */
export function isLate(targetEndDate?: string, status?: InstallationStatus): boolean {
  if (!targetEndDate || status !== 'active') return false;
  return new Date(targetEndDate).getTime() < Date.now();
}

export function personName(p: unknown): string {
  if (!p) return '—';
  if (typeof p === 'string') return p;
  const o = p as { name?: string; firstName?: string; lastName?: string; email?: string };
  if (o.name) return o.name;
  if (o.firstName || o.lastName) return `${o.firstName || ''} ${o.lastName || ''}`.trim();
  return o.email || '—';
}
