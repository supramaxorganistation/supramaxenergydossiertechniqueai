export type Role = 'admin' | 'technician' | 'client';

export type User = {
  _id: string;
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt?: string;
};

export type DossierStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export type CustomerDetails = {
  name: string;
  cin: string;
  phone: string;
  address: string;
  stegMeterRef: string;
};

export type PVSystemParams = {
  peakPowerKwc: number;
  panelCount: number;
  panelBrand: string;
  inverterModel: string;
  dcCableLength: number;
  acCableLength: number;
  tmin?: number;
  tmax?: number;
  acPhase?: 'mono' | 'tri';
  dcCableMode?: string;
  dcCableGrouping?: number;
  dcCableTemp?: number;
  acCableMode?: string;
  acCableGrouping?: number;
  acCableTemp?: number;
  panelAreaM2?: number;
  panelWeightKg?: number;
  structureWeightKg?: number;
  ballastWeightKg?: number;
  supportHeightM?: number;
  ballastLeverM?: number;
  windSpeedKmh?: number;
};

export type EquipmentSpecs = Record<string, number | string | null | undefined>;

export type EquipmentItem = {
  brand?: string;
  model?: string;
  specs?: EquipmentSpecs;
};

export type Equipment = {
  panel?: EquipmentItem;
  inverter?: EquipmentItem;
  dcProtection?: EquipmentItem;
  acProtection?: EquipmentItem;
  dcCable?: EquipmentItem;
  acCable?: EquipmentItem;
};

export type EquipmentCategory = 'PANEL' | 'INVERTER' | 'PROTECTION_DC' | 'PROTECTION_AC' | 'CABLE';

export type CatalogEquipment = {
  _id: string;
  category: EquipmentCategory;
  brand?: string;
  model?: string;
  specs?: EquipmentSpecs;
  fileName?: string;
  fileUrl?: string;
  cableType?: 'AC' | 'DC';
  createdBy?: { _id?: string; name: string; email: string };
  createdAt?: string;
};

export type DossierDocument = {
  fileName: string;
  fileUrl: string;
  fileType: string;
  uploadedAt: string;
};

export type Dossier = {
  _id: string;
  customerDetails: CustomerDetails;
  pvSystemParams: PVSystemParams;
  equipment: Equipment;
  calculations: {
    estimatedAnnualYieldKwh: number;
    dcVoltageDropPercent: number;
    acVoltageDropPercent: number;
    statusOk: boolean;
  };
  complianceReport?: ComplianceReport;
  status: DossierStatus;
  documents: DossierDocument[];
  createdBy: { _id?: string; name: string; email: string };
  assignedTechnician?: { _id?: string; name: string; email: string };
  createdAt: string;
  updatedAt?: string;
};

export type ComplianceReport = {
  timestamp: string;
  errors: string[];
  warnings: string[];
  parameters: Record<string, any>;
  compatibility: {
    stringComputation: {
      nsMax: number;
      nsOpt: number;
      nsMin: number;
      npMax: number;
      npOpt: number;
      panelCount: number;
      nbMppt: number;
      currentSelection: 'VALID' | 'INVALID';
      totalVdcMin: number;
      totalVdcMax: number;
      totalVoc: number;
      impp: number;
    };
    powerRatio: { pvPower: number; acPower: number; ratio: number; valid: boolean; message: string };
    maxStringsParallel?: { ncmax: number; npmaxProtection: number; irm: number; note: string };
  };
  protections: {
    dcSwitch: any;
    spdDc: any;
    acBreaker: any;
    spdAc: any;
  };
  cableAnalysis: {
    dc: any;
    ac: any;
  };
  windAnalysis: any;
  summary: {
    fullCompliant: boolean;
    dcCompliant: boolean;
    acCompliant: boolean;
    stringCompliant: boolean;
    powerCompliant: boolean;
    dcProtectionCompliant: boolean;
    acProtectionCompliant: boolean;
    windCompliant: boolean;
    errorCount: number;
    warningCount: number;
    overallStatus: string;
  };
};
