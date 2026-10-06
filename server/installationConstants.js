// ============================================
// INSTALLATIONS MODULE — CONSTANTS
// Fixed 10-stage pipeline for a photovoltaic installation site,
// default per-stage verification checklists, and shared helpers.
// These constants are the single source of truth for stage codes/order.
// Checklists can be overridden per-tenant via ErpSetting
// (category: "installation_checklists", key: <stageCode>, value: [items]).
// ============================================

export const STAGE_STATUS = ['pending', 'in_progress', 'done', 'blocked'];
export const INSTALLATION_STATUS = ['active', 'completed', 'cancelled'];
export const SYSTEM_TYPES = ['on_grid', 'hybrid', 'off_grid'];

// Ordered, stable stage definitions. `stageNumber` is 1-based and never changes.
export const STAGES = [
  { number: 1,  code: 'quote_preparation', label: 'Préparation du devis',              icon: 'file-text',    color: '#64748b' },
  { number: 2,  code: 'quote_delivered',   label: 'Devis livré au client',             icon: 'check-circle', color: '#0ea5e9' },
  { number: 3,  code: 'site_survey',       label: 'Visite technique et prise de mesures', icon: 'search',    color: '#8b5cf6' },
  { number: 4,  code: 'steg_file',         label: 'Préparation du dossier STEG',       icon: 'clipboard',    color: '#f59e0b' },
  { number: 5,  code: 'material_purchase', label: 'Achat du matériel',                 icon: 'cart',         color: '#ef4444' },
  { number: 6,  code: 'material_delivery', label: 'Livraison du matériel chez le client', icon: 'box',       color: '#14b8a6' },
  { number: 7,  code: 'installation',      label: 'Installation',                      icon: 'zap',          color: '#2563eb' },
  { number: 8,  code: 'steg_reception',    label: 'Réception STEG',                    icon: 'shield',       color: '#eab308' },
  { number: 9,  code: 'meter_change',      label: 'Changement du compteur',            icon: 'refresh',      color: '#ec4899' },
  { number: 10, code: 'completed',         label: 'Installation terminée',             icon: 'check-circle', color: '#22c55e' },
];

export const STAGE_COUNT = STAGES.length; // 10
export const STAGE_BY_NUMBER = STAGES.reduce((acc, s) => { acc[s.number] = s; return acc; }, {});
export const STAGE_BY_CODE = STAGES.reduce((acc, s) => { acc[s.code] = s; return acc; }, {});

// ============================================
// DEFAULT CHECKLISTS (keyed by stage code)
// item: { key, label, type: photo|document|text|link, required, minCount }
// Stages 1-2 have no checklist (driven by the quote status instead).
// ============================================
export const DEFAULT_CHECKLISTS = {
  site_survey: [
    { key: 'roof_photos',            label: 'Photos de la toiture',              type: 'photo',    required: true,  minCount: 2 },
    { key: 'meter_photo',            label: 'Photo du compteur actuel',          type: 'photo',    required: true,  minCount: 1 },
    { key: 'electrical_panel_photo', label: 'Photo du tableau électrique',       type: 'photo',    required: true,  minCount: 1 },
    { key: 'inverter_location_photo',label: "Photo de l'emplacement onduleur",   type: 'photo',    required: true,  minCount: 1 },
    { key: 'usable_surface',         label: 'Surface utile (m²)',                type: 'text',     required: true,  minCount: 1 },
    { key: 'orientation',            label: 'Orientation',                       type: 'text',     required: true,  minCount: 1 },
    { key: 'inclination',            label: 'Inclinaison',                       type: 'text',     required: true,  minCount: 1 },
  ],
  steg_file: [
    { key: 'steg_dossier_docs', label: 'Dossier STEG (PDF)',     type: 'document', required: true, minCount: 1 },
    { key: 'steg_file_number',  label: 'Numéro de dossier STEG', type: 'text',     required: true, minCount: 1 },
  ],
  material_purchase: [
    { key: 'purchase_order_link', label: 'Bon(s) de commande (lien)', type: 'link', required: true, minCount: 1 },
  ],
  material_delivery: [
    { key: 'parcel_photos', label: 'Photos colis / palettes',        type: 'photo',    required: true, minCount: 2 },
    { key: 'delivery_note', label: 'Bon de livraison signé (PDF/photo)', type: 'document', required: true, minCount: 1 },
  ],
  installation: [
    { key: 'panels_photos',     label: 'Photos panneaux posés', type: 'photo', required: true, minCount: 3 },
    { key: 'dc_wiring_photo',   label: 'Câblage DC',            type: 'photo', required: true, minCount: 1 },
    { key: 'inverter_photo',    label: 'Onduleur',              type: 'photo', required: true, minCount: 1 },
    { key: 'protections_photo', label: 'Protections AC/DC',     type: 'photo', required: true, minCount: 1 },
    { key: 'grounding_photo',   label: 'Mise à la terre',       type: 'photo', required: true, minCount: 1 },
  ],
  steg_reception: [
    { key: 'steg_reception_pv', label: 'PV de réception STEG (PDF)',        type: 'document', required: true, minCount: 1 },
    { key: 'steg_tech_photo',   label: 'Photo du technicien STEG sur site', type: 'photo',    required: true, minCount: 1 },
  ],
  meter_change: [
    { key: 'old_meter_photo', label: 'Photo ancien compteur avec index', type: 'photo', required: true, minCount: 1 },
    { key: 'new_meter_photo', label: 'Photo nouveau compteur avec index', type: 'photo', required: true, minCount: 1 },
    { key: 'old_index',       label: 'Index ancien',                     type: 'text',  required: true, minCount: 1 },
    { key: 'new_index',       label: 'Index nouveau',                    type: 'text',  required: true, minCount: 1 },
  ],
  completed: [
    { key: 'final_photo',         label: "Photo finale d'ensemble",     type: 'photo',    required: true, minCount: 1 },
    { key: 'client_reception_pv', label: 'PV de réception client signé', type: 'document', required: true, minCount: 1 },
  ],
};

// ============================================
// ROLE → STAGE ACCESS
// [H] The User model only has admin|technician|client today.
//     admin = every stage; technician = field stages 3,6,7,9 (+ photos).
//     commercial (1-2) and achats (5-6) roles do not exist yet — see Phase 6.
//     Any role not listed here is read-only.
// ============================================
export const STAGE_ROLE_ACCESS = {
  admin: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  technician: [3, 6, 7, 9],
};

export function canEditStage(role, stageNumber) {
  const allowed = STAGE_ROLE_ACCESS[role];
  if (!allowed) return false;
  return allowed.includes(Number(stageNumber));
}

// ============================================
// HELPERS
// ============================================

/**
 * Build the 10 stage sub-documents for a new installation.
 * @param {Record<string, any[]>} overrideMap optional per-stage-code checklist overrides
 * @returns stage objects (status pending, empty photos/documents)
 */
export function buildStages(overrideMap = {}) {
  return STAGES.map((s) => {
    const source = overrideMap[s.code] || DEFAULT_CHECKLISTS[s.code] || [];
    return {
      stageNumber: s.number,
      code: s.code,
      status: 'pending',
      startedAt: null,
      completedAt: null,
      completedBy: null,
      notes: '',
      blockedReason: '',
      checklist: source.map((item) => ({
        key: item.key,
        label: item.label,
        type: item.type || 'text',
        required: item.required !== false,
        minCount: item.minCount || 1,
        isDone: false,
        value: '',
      })),
      photos: [],
      documents: [],
    };
  });
}

/**
 * Count the artifacts attached to a stage that satisfy a checklist item.
 * Photos are matched by `checklistKey`; documents by `type` (falls back to any).
 */
function countArtifactsForItem(stage, item) {
  if (item.type === 'photo') {
    return (stage.photos || []).filter((p) => !item.key || !p.checklistKey || p.checklistKey === item.key).length;
  }
  if (item.type === 'document') {
    const matched = (stage.documents || []).filter((d) => d.checklistKey === item.key);
    if (matched.length) return matched.length;
    // fall back: documents tagged with the same type key
    return (stage.documents || []).filter((d) => d.type === item.key).length;
  }
  return 0;
}

/** True when a single checklist item is satisfied. */
export function isChecklistItemDone(stage, item) {
  if (!item.required) return true;
  if (item.type === 'photo' || item.type === 'document') {
    return countArtifactsForItem(stage, item) >= (item.minCount || 1);
  }
  // text / link: a non-empty value or an explicit tick
  return !!(item.value && String(item.value).trim()) || item.isDone === true;
}

/** True when every required checklist item of a stage is satisfied. */
export function isStageChecklistComplete(stage) {
  return (stage.checklist || []).every((item) => isChecklistItemDone(stage, item));
}

/** Return the list of unmet required items (for UI explanations / API errors). */
export function getMissingChecklistItems(stage) {
  return (stage.checklist || [])
    .filter((item) => item.required && !isChecklistItemDone(stage, item))
    .map((item) => {
      if (item.type === 'photo' || item.type === 'document') {
        const have = countArtifactsForItem(stage, item);
        return { key: item.key, label: item.label, type: item.type, need: item.minCount || 1, have };
      }
      return { key: item.key, label: item.label, type: item.type, need: 1, have: 0 };
    });
}

/** progress % = done stages / 10 * 100 (integer). */
export function computeProgress(stages) {
  const done = (stages || []).filter((s) => s.status === 'done').length;
  return Math.round((done / STAGE_COUNT) * 100);
}
