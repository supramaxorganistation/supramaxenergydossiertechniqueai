import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import {
  STAGES,
  STAGE_COUNT,
  STAGE_BY_NUMBER,
  STAGE_BY_CODE,
  DEFAULT_CHECKLISTS,
  INSTALLATION_STATUS,
  SYSTEM_TYPES,
  STAGE_STATUS,
  buildStages,
  canEditStage,
  isStageChecklistComplete,
  getMissingChecklistItems,
  computeProgress,
} from './installationConstants.js';

const router = express.Router();

// ============================================
// FILE UPLOADS (same convention as server.js: uploads/ served statically)
// ============================================
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

const mediaStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `inst-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

const imageOnly = (req, file, cb) => {
  if (/^image\//.test(file.mimetype)) cb(null, true);
  else cb(new Error('Seules les images sont acceptées pour les photos'));
};

const MEDIA_LIMIT = 25 * 1024 * 1024; // 25 MB
const uploadPhotos = multer({ storage: mediaStorage, limits: { fileSize: MEDIA_LIMIT }, fileFilter: imageOnly });
const uploadDocuments = multer({ storage: mediaStorage, limits: { fileSize: MEDIA_LIMIT } });

function unlinkQuietly(url) {
  try {
    if (!url) return;
    const filename = String(url).split('/').pop();
    const full = path.join('uploads', filename);
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch { /* ignore */ }
}

// Wrap multer so its errors (wrong type, too large) return JSON 400 like the rest of the API.
const photosUpload = (req, res, next) =>
  uploadPhotos.array('photos', 10)(req, res, (err) => (err ? res.status(400).json({ message: err.message }) : next()));
const documentUpload = (req, res, next) =>
  uploadDocuments.single('document')(req, res, (err) => (err ? res.status(400).json({ message: err.message }) : next()));

// ============================================
// SCHEMAS
// ============================================

const checklistItemSchema = new mongoose.Schema({
  key: { type: String, required: true },
  label: { type: String, required: true },
  type: { type: String, enum: ['photo', 'document', 'text', 'link'], default: 'text' },
  required: { type: Boolean, default: true },
  minCount: { type: Number, default: 1 },
  isDone: { type: Boolean, default: false },
  value: { type: String, default: '' },
});

const stagePhotoSchema = new mongoose.Schema({
  url: { type: String, required: true },
  thumbnailUrl: String,
  caption: String,
  takenAt: Date,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  checklistKey: String,
  location: { lat: Number, lng: Number },
});

const stageDocumentSchema = new mongoose.Schema({
  type: String,
  fileName: String,
  url: { type: String, required: true },
  mimeType: String,
  size: Number,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadedAt: { type: Date, default: Date.now },
  checklistKey: String,
});

const stageSchema = new mongoose.Schema({
  stageNumber: { type: Number, required: true },
  code: { type: String, required: true },
  status: { type: String, enum: STAGE_STATUS, default: 'pending' },
  startedAt: Date,
  completedAt: Date,
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String, default: '' },
  blockedReason: { type: String, default: '' },
  checklist: [checklistItemSchema],
  photos: [stagePhotoSchema],
  documents: [stageDocumentSchema],
});

// Insert-only journal. Never updated, never deleted.
const installationEventSchema = new mongoose.Schema({
  type: { type: String, required: true },
  stageNumber: Number,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: String,
  message: String,
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
});

const installationSchema = new mongoose.Schema({
  reference: { type: String, unique: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'ErpCustomer' },
  customerName: String,
  quoteId: { type: mongoose.Schema.Types.ObjectId, ref: 'ErpQuote' },
  title: { type: String, required: true },
  powerKwc: Number,
  systemType: { type: String, enum: SYSTEM_TYPES, default: 'on_grid' },
  address: String,
  governorate: String,
  city: String,
  location: {
    type: { type: String, enum: ['Point'] },
    coordinates: [Number], // [lng, lat]
  },
  status: { type: String, enum: INSTALLATION_STATUS, default: 'active' },
  currentStage: { type: Number, default: 1, min: 1, max: STAGE_COUNT },
  progress: { type: Number, default: 0 },
  isBlocked: { type: Boolean, default: false },
  technicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'ErpEmployee' },
  startDate: Date,
  targetEndDate: Date,
  stegFileNumber: String,
  notes: String,
  cancelReason: String,
  stages: [stageSchema],
  events: [installationEventSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

installationSchema.index({ location: '2dsphere' });
installationSchema.index({ status: 1, currentStage: 1 });
installationSchema.index({ governorate: 1 });
installationSchema.index({ technicianId: 1 });

// Atomic counter for INST-AAAA-NNNN references
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

// ============================================
// MODELS (guard against double registration)
// ============================================
const Installation = mongoose.models.ErpInstallation || mongoose.model('ErpInstallation', installationSchema);
const Counter = mongoose.models.ErpCounter || mongoose.model('ErpCounter', counterSchema);

// ============================================
// HELPERS
// ============================================

async function nextReference() {
  const year = new Date().getFullYear();
  const doc = await Counter.findOneAndUpdate(
    { _id: `installation-${year}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `INST-${year}-${String(doc.seq).padStart(4, '0')}`;
}

// Checklist overrides stored in ErpSetting (category: installation_checklists, key: <stageCode>)
async function getChecklistOverrides() {
  try {
    const Setting = mongoose.models.ErpSetting;
    if (!Setting) return {};
    const rows = await Setting.find({ category: 'installation_checklists' }).lean();
    const map = {};
    for (const r of rows) {
      if (Array.isArray(r.value)) map[r.key] = r.value;
    }
    return map;
  } catch {
    return {};
  }
}

function pushEvent(doc, { type, stageNumber = null, message = '', metadata = null, user }) {
  doc.events.push({
    type,
    stageNumber,
    userId: user?.id || null,
    userName: user?.name || user?.email || 'Système',
    message,
    metadata: metadata || undefined,
    createdAt: new Date(),
  });
}

function normalizeLocation(loc, lat, lng) {
  if (loc && Array.isArray(loc.coordinates) && loc.coordinates.length === 2) {
    return { type: 'Point', coordinates: [Number(loc.coordinates[0]), Number(loc.coordinates[1])] };
  }
  if (Array.isArray(loc) && loc.length === 2) {
    return { type: 'Point', coordinates: [Number(loc[0]), Number(loc[1])] };
  }
  if (lat != null && lng != null) {
    return { type: 'Point', coordinates: [Number(lng), Number(lat)] };
  }
  return undefined;
}

async function populateFull(doc) {
  if (!doc) return doc;
  await doc.populate([
    { path: 'customerId', select: 'name email phone' },
    { path: 'quoteId', select: 'quoteNumber grandTotal status' },
    { path: 'technicianId', select: 'firstName lastName employeeId' },
    { path: 'createdBy', select: 'name email' },
    { path: 'stages.completedBy', select: 'name email' },
    { path: 'stages.photos.uploadedBy', select: 'name email' },
    { path: 'stages.documents.uploadedBy', select: 'name email' },
  ]);
  return doc;
}

function findStage(doc, n) {
  return doc.stages.find((s) => s.stageNumber === Number(n));
}

// Fields editable through PUT /:id (status & stages go through transitions only)
const EDITABLE_FIELDS = [
  'title', 'powerKwc', 'systemType', 'address', 'governorate', 'city',
  'technicianId', 'startDate', 'targetEndDate', 'stegFileNumber', 'notes',
];

// ============================================
// AGGREGATE / LIGHT ROUTES (must precede /:id)
// ============================================

// Summary stats for the dashboard widget
router.get('/stats/summary', async (req, res) => {
  try {
    const now = new Date();
    const [byStageAgg, active, completed, cancelled, blocked, late, recentDocs] = await Promise.all([
      Installation.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$currentStage', count: { $sum: 1 } } },
      ]),
      Installation.countDocuments({ status: 'active' }),
      Installation.countDocuments({ status: 'completed' }),
      Installation.countDocuments({ status: 'cancelled' }),
      Installation.countDocuments({ isBlocked: true }),
      Installation.countDocuments({ status: 'active', targetEndDate: { $lt: now } }),
      Installation.find().sort({ updatedAt: -1 }).limit(5).select('reference customerName title currentStage status events').lean(),
    ]);

    const byStageCount = byStageAgg.reduce((acc, r) => { acc[r._id] = r.count; return acc; }, {});
    const byStage = STAGES.map((s) => ({
      number: s.number, code: s.code, label: s.label, color: s.color,
      count: byStageCount[s.number] || 0,
    }));

    const recentActivities = recentDocs.map((d) => {
      const last = (d.events && d.events.length) ? d.events[d.events.length - 1] : null;
      return {
        _id: d._id,
        reference: d.reference,
        customerName: d.customerName,
        title: d.title,
        currentStage: d.currentStage,
        status: d.status,
        message: last?.message || '',
        type: last?.type || '',
        at: last?.createdAt || d.updatedAt,
      };
    });

    res.json({
      total: active + completed + cancelled,
      byStatus: { active, completed, cancelled },
      byStage,
      blocked,
      late,
      recentActivities,
    });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Light geo list for the map view
router.get('/map', async (req, res) => {
  try {
    const docs = await Installation.find({ status: { $ne: 'cancelled' } })
      .select('reference customerName title currentStage status governorate city location isBlocked')
      .lean();
    const points = docs
      .filter((d) => d.location && Array.isArray(d.location.coordinates) && d.location.coordinates.length === 2)
      .map((d) => ({
        _id: d._id,
        reference: d.reference,
        customerName: d.customerName,
        title: d.title,
        currentStage: d.currentStage,
        status: d.status,
        governorate: d.governorate,
        city: d.city,
        isBlocked: d.isBlocked,
        coordinates: d.location.coordinates, // [lng, lat]
      }));
    res.json(points);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ============================================
// CHECKLIST CONFIGURATION (admin)
// Effective config = ErpSetting overrides merged over DEFAULT_CHECKLISTS.
// Applies to newly created installations (buildStages reads the overrides).
// ============================================
const CHECKLIST_ITEM_TYPES = ['photo', 'document', 'text', 'link'];

function sanitizeChecklistItems(raw) {
  if (!Array.isArray(raw)) return null;
  const out = [];
  const seen = new Set();
  for (const it of raw) {
    if (!it || typeof it !== 'object') continue;
    const key = String(it.key || '').trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_');
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const type = CHECKLIST_ITEM_TYPES.includes(it.type) ? it.type : 'text';
    out.push({
      key,
      label: String(it.label || key).slice(0, 120),
      type,
      required: it.required !== false,
      minCount: (type === 'photo' || type === 'document') ? Math.max(1, parseInt(it.minCount, 10) || 1) : 1,
    });
  }
  return out;
}

// Read the effective checklist configuration for all 10 stages
router.get('/config/checklists', async (req, res) => {
  try {
    const overrides = await getChecklistOverrides();
    const stages = STAGES.map((s) => {
      const customized = Array.isArray(overrides[s.code]);
      const items = customized ? overrides[s.code] : (DEFAULT_CHECKLISTS[s.code] || []);
      return { number: s.number, code: s.code, label: s.label, customized, items };
    });
    res.json({ stages, itemTypes: CHECKLIST_ITEM_TYPES });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Save checklist overrides. Body: { checklists: { <stageCode>: [items] | null } }
// A null value resets that stage to the default checklist.
router.put('/config/checklists', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden: admin only' });
    const Setting = mongoose.models.ErpSetting;
    if (!Setting) return res.status(500).json({ message: 'Setting model unavailable' });
    const incoming = (req.body && req.body.checklists) || {};
    const codes = Object.keys(incoming);
    if (!codes.length) return res.status(400).json({ message: 'checklists is required' });

    for (const code of codes) {
      if (!STAGE_BY_CODE[code]) return res.status(400).json({ message: `Unknown stage code: ${code}` });
    }

    for (const code of codes) {
      const val = incoming[code];
      if (val === null) {
        await Setting.deleteMany({ category: 'installation_checklists', key: code });
        continue;
      }
      const items = sanitizeChecklistItems(val);
      if (!items) return res.status(400).json({ message: `Invalid checklist for ${code}` });
      await Setting.findOneAndUpdate(
        { category: 'installation_checklists', key: code },
        { $set: { value: items, valueType: 'json', label: STAGE_BY_CODE[code].label, updatedBy: req.user.id, updatedAt: new Date() } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    }

    const overrides = await getChecklistOverrides();
    const stages = STAGES.map((s) => ({
      number: s.number, code: s.code, label: s.label,
      customized: Array.isArray(overrides[s.code]),
      items: Array.isArray(overrides[s.code]) ? overrides[s.code] : (DEFAULT_CHECKLISTS[s.code] || []),
    }));
    res.json({ stages, itemTypes: CHECKLIST_ITEM_TYPES });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Create an installation prefilled from an approved/sent quote
router.post('/from-quote/:quoteId', async (req, res) => {
  try {
    const Quote = mongoose.models.ErpQuote;
    if (!Quote) return res.status(500).json({ message: 'Quote model unavailable' });
    const quote = await Quote.findById(req.params.quoteId).populate('customer', 'name email phone');
    if (!quote) return res.status(404).json({ message: 'Quote not found' });

    const overrides = await getChecklistOverrides();
    const reference = await nextReference();
    const stages = buildStages(overrides);

    // Align stages 1-2 with the quote status (without overwriting a manual validation later)
    let currentStage = 1;
    const qStatus = quote.status;
    if (qStatus === 'sent') {
      stages[0].status = 'done'; stages[0].completedAt = new Date();
      stages[1].status = 'in_progress'; stages[1].startedAt = new Date();
      currentStage = 2;
    } else if (['approved', 'converted'].includes(qStatus)) {
      stages[0].status = 'done'; stages[0].completedAt = new Date();
      stages[1].status = 'done'; stages[1].completedAt = new Date();
      if (stages[2]) { stages[2].status = 'in_progress'; stages[2].startedAt = new Date(); }
      currentStage = 3;
    } else {
      stages[0].status = 'in_progress'; stages[0].startedAt = new Date();
      currentStage = 1;
    }

    const customerId = quote.customer?._id || quote.customer;
    const doc = await Installation.create({
      reference,
      customerId,
      customerName: quote.customer?.name || quote.customerName,
      quoteId: quote._id,
      title: `Installation — ${quote.quoteNumber || 'devis'}`,
      systemType: req.body?.systemType || 'on_grid',
      governorate: req.body?.governorate,
      city: req.body?.city,
      address: req.body?.address,
      currentStage,
      progress: computeProgress(stages),
      stages,
      createdBy: req.user.id,
    });

    pushEvent(doc, {
      type: 'installation_created',
      message: `Installation créée depuis le devis ${quote.quoteNumber || quote._id}`,
      metadata: { fromQuote: String(quote._id), quoteStatus: qStatus },
      user: req.user,
    });
    await doc.save();

    res.status(201).json(await populateFull(doc));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ============================================
// LIST + CREATE
// ============================================

router.get('/', async (req, res) => {
  try {
    const { stage, status, technicianId, governorate, late, blocked, q } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const sort = typeof req.query.sort === 'string' && /^-?[a-zA-Z]+$/.test(req.query.sort)
      ? req.query.sort : '-createdAt';

    const filter = {};
    if (status) filter.status = status;
    if (stage) filter.currentStage = Number(stage);
    if (technicianId) filter.technicianId = technicianId;
    if (governorate) filter.governorate = new RegExp(`^${String(governorate).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    if (blocked === 'true') filter.isBlocked = true;
    if (late === 'true') { filter.status = 'active'; filter.targetEndDate = { $lt: new Date() }; }
    if (q) {
      const rx = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ reference: rx }, { title: rx }, { customerName: rx }, { city: rx }];
    }

    const [items, total] = await Promise.all([
      Installation.find(filter)
        .select('-stages -events')
        .populate('technicianId', 'firstName lastName')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit),
      Installation.countDocuments(filter),
    ]);

    res.json({ items, total, page, pages: Math.ceil(total / limit) || 1 });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.title || !String(b.title).trim()) return res.status(400).json({ message: 'title is required' });
    if (!b.customerId) return res.status(400).json({ message: 'customerId is required' });

    const overrides = await getChecklistOverrides();
    const reference = await nextReference();

    let customerName = b.customerName;
    try {
      const Customer = mongoose.models.ErpCustomer;
      if (Customer) {
        const c = await Customer.findById(b.customerId).select('name');
        if (c) customerName = c.name;
      }
    } catch { /* ignore */ }

    const stages = buildStages(overrides);
    stages[0].status = 'in_progress';
    stages[0].startedAt = new Date();

    const location = normalizeLocation(b.location, b.lat, b.lng);

    const doc = await Installation.create({
      reference,
      customerId: b.customerId,
      customerName,
      quoteId: b.quoteId || undefined,
      title: String(b.title).trim(),
      powerKwc: b.powerKwc != null ? Number(b.powerKwc) : undefined,
      systemType: b.systemType || 'on_grid',
      address: b.address,
      governorate: b.governorate,
      city: b.city,
      ...(location ? { location } : {}),
      technicianId: b.technicianId || undefined,
      startDate: b.startDate || undefined,
      targetEndDate: b.targetEndDate || undefined,
      stegFileNumber: b.stegFileNumber,
      notes: b.notes,
      currentStage: 1,
      progress: 0,
      stages,
      createdBy: req.user.id,
    });

    pushEvent(doc, { type: 'installation_created', message: `Installation ${reference} créée`, user: req.user });
    await doc.save();

    res.status(201).json(await populateFull(doc));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ============================================
// SINGLE DOCUMENT
// ============================================

router.get('/:id', async (req, res) => {
  try {
    const doc = await Installation.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(await populateFull(doc));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const doc = await Installation.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });

    for (const f of EDITABLE_FIELDS) {
      if (req.body[f] !== undefined) doc[f] = req.body[f];
    }
    const location = normalizeLocation(req.body.location, req.body.lat, req.body.lng);
    if (location) doc.location = location;

    doc.updatedAt = new Date();
    pushEvent(doc, { type: 'installation_updated', message: 'Informations de l’installation mises à jour', user: req.user });
    await doc.save();

    res.json(await populateFull(doc));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Cancel — admin only, reason mandatory
router.post('/:id/cancel', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden: admin only' });
    const reason = req.body?.reason;
    if (!reason || !String(reason).trim()) return res.status(400).json({ message: 'reason is required' });

    const doc = await Installation.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    if (doc.status === 'cancelled') return res.status(400).json({ message: 'Already cancelled' });

    doc.status = 'cancelled';
    doc.cancelReason = String(reason).trim();
    doc.updatedAt = new Date();
    pushEvent(doc, { type: 'installation_cancelled', message: `Installation annulée : ${doc.cancelReason}`, metadata: { reason: doc.cancelReason }, user: req.user });
    await doc.save();

    res.json(await populateFull(doc));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ============================================
// STAGE TRANSITIONS
// ============================================

router.post('/:id/stages/:n/start', async (req, res) => {
  try {
    const n = Number(req.params.n);
    if (!STAGE_BY_NUMBER[n]) return res.status(400).json({ message: 'Invalid stage number' });
    const doc = await Installation.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    if (doc.status !== 'active') return res.status(400).json({ message: 'Installation is not active' });
    if (req.user.role !== 'admin' && !canEditStage(req.user.role, n)) {
      return res.status(403).json({ message: 'Forbidden: insufficient permissions for this stage' });
    }

    const stage = findStage(doc, n);
    if (!stage) return res.status(400).json({ message: 'Stage not found' });
    if (stage.status === 'done') return res.status(400).json({ message: 'Stage already completed' });

    stage.status = 'in_progress';
    if (!stage.startedAt) stage.startedAt = new Date();
    stage.blockedReason = '';
    doc.isBlocked = doc.stages.some((s) => s.status === 'blocked');
    doc.currentStage = n;
    doc.updatedAt = new Date();
    pushEvent(doc, { type: 'stage_started', stageNumber: n, message: `Étape ${n} — ${STAGE_BY_NUMBER[n].label} démarrée`, user: req.user });
    await doc.save();

    res.json(await populateFull(doc));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/:id/stages/:n/complete', async (req, res) => {
  try {
    const n = Number(req.params.n);
    if (!STAGE_BY_NUMBER[n]) return res.status(400).json({ message: 'Invalid stage number' });
    const { reason, adminOverride } = req.body || {};

    const doc = await Installation.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    if (doc.status !== 'active') return res.status(400).json({ message: 'Installation is not active' });

    const isAdmin = req.user.role === 'admin';
    if (!isAdmin && !canEditStage(req.user.role, n)) {
      return res.status(403).json({ message: 'Forbidden: insufficient permissions for this stage' });
    }

    const stage = findStage(doc, n);
    if (!stage) return res.status(400).json({ message: 'Stage not found' });
    if (stage.status === 'done') return res.status(400).json({ message: 'Stage already completed' });

    const canOverride = isAdmin && adminOverride && reason && String(reason).trim();
    let overridden = false;

    // Rule 1a: previous stage must be done
    if (n > 1) {
      const prev = findStage(doc, n - 1);
      if (prev && prev.status !== 'done') {
        if (!canOverride) {
          return res.status(400).json({ message: `L’étape ${n - 1} doit être validée avant l’étape ${n}`, code: 'prev_not_done' });
        }
        overridden = true;
      }
    }

    // Rule 1b: mandatory checklist of stage N must be complete
    if (!isStageChecklistComplete(stage)) {
      if (!canOverride) {
        return res.status(400).json({
          message: 'Checklist incomplète pour cette étape',
          code: 'checklist_incomplete',
          missing: getMissingChecklistItems(stage),
        });
      }
      overridden = true;
    }

    if (overridden) {
      pushEvent(doc, {
        type: 'admin_override', stageNumber: n,
        message: `Validation forcée de l’étape ${n} par un administrateur : ${String(reason).trim()}`,
        metadata: { reason: String(reason).trim() }, user: req.user,
      });
    }

    // Rule 2: mark done + advance
    stage.status = 'done';
    stage.completedAt = new Date();
    stage.completedBy = req.user.id;
    stage.blockedReason = '';

    if (n < STAGE_COUNT) {
      const next = findStage(doc, n + 1);
      if (next && next.status === 'pending') { next.status = 'in_progress'; next.startedAt = new Date(); }
      doc.currentStage = n + 1;
    } else {
      // Rule 4: final stage → installation completed
      doc.status = 'completed';
      doc.currentStage = STAGE_COUNT;
    }

    doc.isBlocked = doc.stages.some((s) => s.status === 'blocked');
    doc.progress = computeProgress(doc.stages);
    doc.updatedAt = new Date();
    pushEvent(doc, {
      type: 'stage_completed', stageNumber: n,
      message: `Étape ${n} — ${STAGE_BY_NUMBER[n].label} validée`, user: req.user,
    });
    await doc.save();

    res.json(await populateFull(doc));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Block — reason mandatory
router.post('/:id/stages/:n/block', async (req, res) => {
  try {
    const n = Number(req.params.n);
    if (!STAGE_BY_NUMBER[n]) return res.status(400).json({ message: 'Invalid stage number' });
    const reason = req.body?.reason;
    if (!reason || !String(reason).trim()) return res.status(400).json({ message: 'reason is required' });

    const doc = await Installation.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    if (doc.status !== 'active') return res.status(400).json({ message: 'Installation is not active' });
    if (req.user.role !== 'admin' && !canEditStage(req.user.role, n)) {
      return res.status(403).json({ message: 'Forbidden: insufficient permissions for this stage' });
    }

    const stage = findStage(doc, n);
    if (!stage) return res.status(400).json({ message: 'Stage not found' });

    stage.status = 'blocked';
    stage.blockedReason = String(reason).trim();
    doc.isBlocked = true;
    doc.updatedAt = new Date();
    pushEvent(doc, {
      type: 'stage_blocked', stageNumber: n,
      message: `Étape ${n} bloquée : ${stage.blockedReason}`,
      metadata: { reason: stage.blockedReason }, user: req.user,
    });
    await doc.save();

    res.json(await populateFull(doc));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/:id/stages/:n/unblock', async (req, res) => {
  try {
    const n = Number(req.params.n);
    if (!STAGE_BY_NUMBER[n]) return res.status(400).json({ message: 'Invalid stage number' });

    const doc = await Installation.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    if (doc.status !== 'active') return res.status(400).json({ message: 'Installation is not active' });
    if (req.user.role !== 'admin' && !canEditStage(req.user.role, n)) {
      return res.status(403).json({ message: 'Forbidden: insufficient permissions for this stage' });
    }

    const stage = findStage(doc, n);
    if (!stage) return res.status(400).json({ message: 'Stage not found' });

    stage.status = 'in_progress';
    if (!stage.startedAt) stage.startedAt = new Date();
    stage.blockedReason = '';
    doc.isBlocked = doc.stages.some((s) => s.status === 'blocked');
    doc.updatedAt = new Date();
    pushEvent(doc, { type: 'stage_unblocked', stageNumber: n, message: `Étape ${n} débloquée`, user: req.user });
    await doc.save();

    res.json(await populateFull(doc));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Update a checklist item value / tick (text, link, or manual checkbox)
router.put('/:id/stages/:n/checklist/:key', async (req, res) => {
  try {
    const n = Number(req.params.n);
    const doc = await Installation.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    if (doc.status !== 'active') return res.status(400).json({ message: 'Installation is not active' });
    if (req.user.role !== 'admin' && !canEditStage(req.user.role, n)) {
      return res.status(403).json({ message: 'Forbidden: insufficient permissions for this stage' });
    }

    const stage = findStage(doc, n);
    if (!stage) return res.status(400).json({ message: 'Stage not found' });
    const item = stage.checklist.find((c) => c.key === req.params.key);
    if (!item) return res.status(404).json({ message: 'Checklist item not found' });

    if (req.body.value !== undefined) item.value = String(req.body.value);
    if (req.body.isDone !== undefined) item.isDone = !!req.body.isDone;

    doc.updatedAt = new Date();
    await doc.save();

    res.json({ stageNumber: n, code: stage.code, checklist: stage.checklist });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ============================================
// STAGE MEDIA — photos & documents (multipart)
// ============================================

// Guards shared by the media routes
async function loadEditableStage(req, res) {
  const n = Number(req.params.n);
  if (!STAGE_BY_NUMBER[n]) { res.status(400).json({ message: 'Invalid stage number' }); return null; }
  const doc = await Installation.findById(req.params.id);
  if (!doc) { res.status(404).json({ message: 'Not found' }); return null; }
  if (req.user.role !== 'admin' && !canEditStage(req.user.role, n)) {
    res.status(403).json({ message: 'Forbidden: insufficient permissions for this stage' }); return null;
  }
  const stage = findStage(doc, n);
  if (!stage) { res.status(400).json({ message: 'Stage not found' }); return null; }
  return { doc, stage, n };
}

router.post('/:id/stages/:n/photos', photosUpload, async (req, res) => {
  try {
    const ctx = await loadEditableStage(req, res);
    if (!ctx) return;
    const { doc, stage, n } = ctx;
    if (doc.status !== 'active') return res.status(400).json({ message: 'Installation is not active' });

    const files = req.files || [];
    if (!files.length) return res.status(400).json({ message: 'Aucun fichier reçu' });

    const checklistKey = req.body.checklistKey || '';
    const caption = req.body.caption || '';
    const takenAt = req.body.takenAt ? new Date(req.body.takenAt) : new Date();
    const lat = req.body.lat != null && req.body.lat !== '' ? Number(req.body.lat) : undefined;
    const lng = req.body.lng != null && req.body.lng !== '' ? Number(req.body.lng) : undefined;

    for (const f of files) {
      stage.photos.push({
        url: `/uploads/${f.filename}`,
        caption: caption || undefined,
        takenAt,
        uploadedBy: req.user.id,
        checklistKey: checklistKey || undefined,
        ...(lat != null && lng != null ? { location: { lat, lng } } : {}),
      });
    }

    doc.updatedAt = new Date();
    pushEvent(doc, {
      type: 'photo_added', stageNumber: n,
      message: `${files.length} photo(s) ajoutée(s) à l’étape ${n}`,
      metadata: { count: files.length, checklistKey: checklistKey || undefined }, user: req.user,
    });
    await doc.save();
    res.status(201).json(await populateFull(doc));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/:id/stages/:n/documents', documentUpload, async (req, res) => {
  try {
    const ctx = await loadEditableStage(req, res);
    if (!ctx) return;
    const { doc, stage, n } = ctx;
    if (doc.status !== 'active') return res.status(400).json({ message: 'Installation is not active' });

    const f = req.file;
    if (!f) return res.status(400).json({ message: 'Aucun fichier reçu' });

    stage.documents.push({
      type: req.body.type || undefined,
      fileName: f.originalname,
      url: `/uploads/${f.filename}`,
      mimeType: f.mimetype,
      size: f.size,
      uploadedBy: req.user.id,
      uploadedAt: new Date(),
      checklistKey: req.body.checklistKey || undefined,
    });

    doc.updatedAt = new Date();
    pushEvent(doc, {
      type: 'document_added', stageNumber: n,
      message: `Document « ${f.originalname} » ajouté à l’étape ${n}`, user: req.user,
    });
    await doc.save();
    res.status(201).json(await populateFull(doc));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/:id/stages/:n/photos/:photoId', async (req, res) => {
  try {
    const ctx = await loadEditableStage(req, res);
    if (!ctx) return;
    const { doc, stage, n } = ctx;
    const idx = stage.photos.findIndex((p) => String(p._id) === String(req.params.photoId));
    if (idx === -1) return res.status(404).json({ message: 'Photo not found' });
    const photo = stage.photos[idx];
    const isAdmin = req.user.role === 'admin';
    if (!isAdmin && String(photo.uploadedBy?._id || photo.uploadedBy) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Forbidden: you can only delete your own photos' });
    }
    unlinkQuietly(photo.url);
    stage.photos.splice(idx, 1);
    doc.updatedAt = new Date();
    pushEvent(doc, { type: 'photo_removed', stageNumber: n, message: `Photo supprimée de l’étape ${n}`, user: req.user });
    await doc.save();
    res.json(await populateFull(doc));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/:id/stages/:n/documents/:docId', async (req, res) => {
  try {
    const ctx = await loadEditableStage(req, res);
    if (!ctx) return;
    const { doc, stage, n } = ctx;
    const idx = stage.documents.findIndex((d) => String(d._id) === String(req.params.docId));
    if (idx === -1) return res.status(404).json({ message: 'Document not found' });
    const d = stage.documents[idx];
    const isAdmin = req.user.role === 'admin';
    if (!isAdmin && String(d.uploadedBy?._id || d.uploadedBy) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Forbidden: you can only delete your own documents' });
    }
    unlinkQuietly(d.url);
    stage.documents.splice(idx, 1);
    doc.updatedAt = new Date();
    pushEvent(doc, { type: 'document_removed', stageNumber: n, message: `Document « ${d.fileName || ''} » supprimé de l’étape ${n}`, user: req.user });
    await doc.save();
    res.json(await populateFull(doc));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ============================================
// EVENT JOURNAL (read-only)
// ============================================

router.get('/:id/events', async (req, res) => {
  try {
    const doc = await Installation.findById(req.params.id).select('events').populate('events.userId', 'name email');
    if (!doc) return res.status(404).json({ message: 'Not found' });
    const events = [...doc.events].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(events);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

export { router as installationRouter, Installation, Counter, nextReference };
