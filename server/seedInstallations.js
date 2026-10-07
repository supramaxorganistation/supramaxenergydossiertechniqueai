// ============================================
// INSTALLATIONS MODULE — DEMO SEED
// Idempotent. Refuses to run in production unless --force is passed.
// Usage:  node seedInstallations.js [--force]
// Creates 5 installations at different stages (1 blocked, 1 late) across
// several Tunisian governorates, linked to demo customers (created if absent).
// ============================================
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import for side effects: registers the ErpCustomer / ErpQuote / ... models
import './erpRoutes.js';
import { Installation } from './installationRoutes.js';
import { buildStages, computeProgress } from './installationConstants.js';

const FORCE = process.argv.includes('--force');

if (process.env.NODE_ENV === 'production' && !FORCE) {
  console.error('❌ seedInstallations refuse de tourner en production. Utilisez --force si vous êtes sûr.');
  process.exit(1);
}

const Customer = mongoose.model('ErpCustomer');

// The User model is defined in server.js (not erpRoutes.js). Refs only need an
// ObjectId, so read one admin user straight from the raw collection.
async function findSeedUserId() {
  try {
    const users = mongoose.connection.db.collection('users');
    const u = (await users.findOne({ role: 'admin' })) || (await users.findOne({}));
    return u?._id || null;
  } catch {
    return null;
  }
}

// Advance an installation so that stages [1..target-1] are done and `target` is in_progress.
function advanceTo(doc, target, { block = false, late = false } = {}) {
  const stages = doc.stages;
  for (let i = 0; i < stages.length; i++) {
    const s = stages[i];
    if (s.stageNumber < target) {
      s.status = 'done';
      s.startedAt = new Date(Date.now() - (target - s.stageNumber) * 86400000);
      s.completedAt = new Date(Date.now() - (target - s.stageNumber - 1) * 86400000);
      // tick required text/link items so the stage looks genuinely completed
      for (const item of s.checklist) {
        if (item.type === 'text' || item.type === 'link') { item.value = 'OK'; item.isDone = true; }
      }
    } else if (s.stageNumber === target) {
      s.status = block ? 'blocked' : 'in_progress';
      s.startedAt = new Date();
      if (block) s.blockedReason = 'Matériel endommagé à la livraison — en attente de remplacement fournisseur.';
    } else {
      s.status = 'pending';
    }
  }
  doc.currentStage = target;
  doc.isBlocked = block;
  doc.progress = computeProgress(stages);
  if (late) doc.targetEndDate = new Date(Date.now() - 5 * 86400000); // 5 days overdue
  doc.events.push({
    type: 'seed', message: `Données de démonstration — positionnée à l’étape ${target}`, createdAt: new Date(),
  });
}

const DEMO_CUSTOMERS = [
  { name: 'Société Delta Plus', email: 'contact@deltaplus.tn', phone: '+216 71 234 567', city: 'Tunis',   governorate: 'Tunis' },
  { name: 'Karim Ben Salah',     email: 'karim.bs@example.tn',  phone: '+216 98 765 432', city: 'Ariana',  governorate: 'Ariana' },
  { name: 'Hôtel Marina Sfax',   email: 'direction@marina-sfax.tn', phone: '+216 74 456 789', city: 'Sfax', governorate: 'Sfax' },
  { name: 'Usine Textile Sousse', email: 'maintenance@texsous.tn', phone: '+216 73 321 654', city: 'Sousse', governorate: 'Sousse' },
  { name: 'Lina Trabelsi',       email: 'lina.trabelsi@example.tn', phone: '+216 22 111 222', city: 'Nabeul', governorate: 'Nabeul' },
];

// target stage / flags for the 5 demo installations (coords = [lng, lat])
const DEMO_INSTALLATIONS = [
  { idx: 0, title: 'Toiture industrielle 100 kWc',     powerKwc: 100, systemType: 'on_grid', target: 7, block: false, late: false, address: 'Zone Industrielle, Tunis', coords: [10.1667, 36.8065] },
  { idx: 1, title: 'Résidence privée 6 kWc',           powerKwc: 6,   systemType: 'hybrid',  target: 3, block: false, late: false, address: 'Ennasr 2, Ariana', coords: [10.1970, 36.8660] },
  { idx: 2, title: 'Ombrières parking 250 kWc',        powerKwc: 250, systemType: 'on_grid', target: 5, block: true,  late: false, address: 'Route de la plage, Sfax', coords: [10.7600, 34.7400] },
  { idx: 3, title: 'Centrale usine 400 kWc',           powerKwc: 400, systemType: 'on_grid', target: 4, block: false, late: true,  address: 'Zone Industrielle, Sousse', coords: [10.6080, 35.8250] },
  { idx: 4, title: 'Villa solaire 3 kWc',              powerKwc: 3,   systemType: 'off_grid',target: 10, block: false, late: false, address: 'Hammamet Nord, Nabeul', coords: [10.6000, 36.4000] },
];

async function run() {
  const existing = await Installation.countDocuments();
  if (existing > 0 && !FORCE) {
    console.log(`ℹ️  ${existing} installation(s) déjà présente(s) — seed ignoré. (Utilisez --force pour réinitialiser.)`);
    return;
  }
  if (existing > 0 && FORCE) {
    console.log(`♻️  --force : suppression des ${existing} installation(s) existante(s)…`);
    await Installation.deleteMany({});
  }

  // Ensure a system user exists for createdBy / completedBy
  const userId = await findSeedUserId();

  // Ensure demo customers exist
  const customers = [];
  for (const c of DEMO_CUSTOMERS) {
    let found = await Customer.findOne({ name: c.name });
    if (!found) {
      found = await Customer.create({ ...c, country: 'Tunisia', customerGroup: c.name.includes('Société') || c.name.includes('Usine') || c.name.includes('Hôtel') ? 'company' : 'individual', createdBy: userId });
      console.log(`  + client créé : ${c.name}`);
    }
    customers.push(found);
  }

  const overrides = {}; // no ErpSetting overrides in demo
  for (const spec of DEMO_INSTALLATIONS) {
    const customer = customers[spec.idx];
    const stages = buildStages(overrides);
    const year = new Date().getFullYear();
    const seq = String(spec.idx + 1).padStart(4, '0');
    const doc = new Installation({
      reference: `INST-${year}-9${seq}`, // 9xxx range so it never collides with real counters
      customerId: customer._id,
      customerName: customer.name,
      title: spec.title,
      powerKwc: spec.powerKwc,
      systemType: spec.systemType,
      address: spec.address,
      governorate: customer.governorate,
      city: customer.city,
      location: { type: 'Point', coordinates: spec.coords },
      status: spec.target === 10 && !spec.block ? 'completed' : 'active',
      startDate: new Date(Date.now() - 30 * 86400000),
      targetEndDate: new Date(Date.now() + 20 * 86400000),
      stages,
      createdBy: userId,
      events: [],
    });

    if (spec.target === 10 && !spec.block) {
      // fully completed
      for (const s of doc.stages) {
        s.status = 'done'; s.startedAt = new Date(); s.completedAt = new Date();
        for (const item of s.checklist) { if (item.type === 'text' || item.type === 'link') { item.value = 'OK'; item.isDone = true; } }
      }
      doc.currentStage = 10; doc.progress = 100; doc.isBlocked = false;
      doc.events.push({ type: 'seed', message: 'Données de démonstration — installation terminée', createdAt: new Date() });
    } else {
      advanceTo(doc, spec.target, { block: spec.block, late: spec.late });
    }

    await doc.save();
    console.log(`  ✓ ${doc.reference} — ${spec.title} (étape ${spec.target}${spec.block ? ', BLOQUÉE' : ''}${spec.late ? ', EN RETARD' : ''})`);
  }

  console.log(`\n✅ Seed terminé : ${DEMO_INSTALLATIONS.length} installations créées.`);
}

mongoose.connect(process.env.MONGO_URI)
  .then(run)
  .then(() => mongoose.disconnect())
  .then(() => { console.log('Done.'); process.exit(0); })
  .catch((err) => { console.error('Seed error:', err); process.exit(1); });
