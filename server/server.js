import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { scanDatasheet } from './services/aiScanner.js';
import { computeStegCompliance } from './utils/stegCalculations.js';
import { generateStegPDF } from './services/pdfGenerator.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-me';

app.use(cors());
app.use(express.json());
app.use(express.static('uploads'));

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// ============================================
// MONGOOSE SCHEMAS
// ============================================

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'technician', 'client'], default: 'technician' },
  createdAt: { type: Date, default: Date.now }
});

const dossierSchema = new mongoose.Schema({
  customerDetails: {
    name: { type: String, required: true },
    cin: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    stegMeterRef: { type: String, required: true }
  },
  pvSystemParams: {
    peakPowerKwc: { type: Number, required: true },
    panelCount: { type: Number, required: true },
    panelBrand: { type: String, required: true },
    inverterModel: { type: String, required: true },
    dcCableLength: { type: Number, default: 0 },
    acCableLength: { type: Number, default: 0 },
    tmin: { type: Number, default: -10 },
    tmax: { type: Number, default: 85 },
    acPhase: { type: String, enum: ['mono', 'tri'], default: 'mono' },
    dcCableMode: String,
    dcCableGrouping: Number,
    dcCableTemp: Number,
    dcCableLayers: Number,
    acCableMode: String,
    acCableGrouping: Number,
    acCableTemp: Number,
    acCableLayers: Number,
    panelAreaM2: Number,
    panelWeightKg: Number,
    structureWeightKg: Number,
    ballastWeightKg: Number,
    supportHeightM: Number,
    ballastLeverM: Number,
    windSpeedKmh: Number
  },
  equipment: {
    panel: {
      brand: String,
      model: String,
      specs: mongoose.Schema.Types.Mixed
    },
    inverter: {
      brand: String,
      model: String,
      specs: mongoose.Schema.Types.Mixed
    },
    dcProtection: {
      brand: String,
      model: String,
      specs: mongoose.Schema.Types.Mixed
    },
    acProtection: {
      brand: String,
      model: String,
      specs: mongoose.Schema.Types.Mixed
    },
    dcCable: {
      brand: String,
      specs: mongoose.Schema.Types.Mixed
    },
    acCable: {
      brand: String,
      specs: mongoose.Schema.Types.Mixed
    }
  },
  calculations: {
    estimatedAnnualYieldKwh: { type: Number, default: 0 },
    dcVoltageDropPercent: { type: Number, default: 0 },
    acVoltageDropPercent: { type: Number, default: 0 },
    statusOk: { type: Boolean, default: true }
  },
  complianceReport: mongoose.Schema.Types.Mixed,
  status: { type: String, enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'], default: 'DRAFT' },
  documents: [
    {
      fileName: String,
      fileUrl: String,
      fileType: String,
      uploadedAt: { type: Date, default: Date.now }
    }
  ],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTechnician: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Dossier = mongoose.model('Dossier', dossierSchema);
const Item = mongoose.model('Item', itemSchema);

// ============================================
// UTILITIES
// ============================================

const signToken = (user) => {
  return jwt.sign(
    { id: user._id?.toString() || user.id, email: user.email, role: user.role },
    jwtSecret,
    { expiresIn: '7d' }
  );
};

const calculatePVMetrics = (params) => {
  const estimatedAnnualYieldKwh = params.peakPowerKwc * 1200;
  const dcVoltageDropPercent = (params.dcCableLength * params.peakPowerKwc) / 500;
  const acVoltageDropPercent = (params.acCableLength * params.peakPowerKwc) / 800;
  const statusOk = dcVoltageDropPercent < 3 && acVoltageDropPercent < 3;

  return { estimatedAnnualYieldKwh, dcVoltageDropPercent, acVoltageDropPercent, statusOk };
};

// ============================================
// MIDDLEWARE
// ============================================

const authMiddleware = async (req, res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing bearer token' });
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, jwtSecret);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
    }
    next();
  };
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// ============================================
// AUTH ROUTES
// ============================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: 'client'
    });

    res.status(201).json({
      token: signToken(newUser),
      user: { id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    res.json({
      token: signToken(user),
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// USER ROUTES (admin)
// ============================================

app.get('/api/users', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(
      users.map((u) => ({
        _id: u._id,
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt
      }))
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/users/:id/role', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'technician', 'client'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'You cannot change your own role' });
    }
    user.role = role;
    await user.save();
    res.json({
      _id: user._id,
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/users', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    const normalizedRole = ['admin', 'technician', 'client'].includes(role) ? role : 'technician';

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: normalizedRole
    });

    res.status(201).json({
      _id: newUser._id,
      id: newUser._id.toString(),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      createdAt: newUser.createdAt
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// DOSSIER ROUTES (with RBAC)
// ============================================

app.get('/api/dossiers', authMiddleware, async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'client') {
      query.createdBy = new mongoose.Types.ObjectId(req.user.id);
    } else if (req.user.role === 'technician') {
      query.$or = [
        { createdBy: new mongoose.Types.ObjectId(req.user.id) },
        { assignedTechnician: new mongoose.Types.ObjectId(req.user.id) }
      ];
    }

    const dossiers = await Dossier.find(query)
      .populate('createdBy', 'name email')
      .populate('assignedTechnician', 'name email')
      .sort({ createdAt: -1 });

    res.json(dossiers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/dossiers', authMiddleware, authorizeRoles('admin', 'technician'), async (req, res) => {
  try {
    const { customerDetails, pvSystemParams } = req.body;

    if (!customerDetails || !pvSystemParams) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const calculations = calculatePVMetrics(pvSystemParams);

    const newDossier = await Dossier.create({
      customerDetails,
      pvSystemParams,
      calculations,
      createdBy: req.user.id
    });

    const populated = await newDossier.populate('createdBy', 'name email');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/dossiers/:id', authMiddleware, async (req, res) => {
  try {
    const dossier = await Dossier.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignedTechnician', 'name email');

    if (!dossier) {
      return res.status(404).json({ message: 'Dossier not found' });
    }

    if (req.user.role === 'client' && dossier.createdBy._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.json(dossier);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/dossiers/:id', authMiddleware, authorizeRoles('admin', 'technician'), async (req, res) => {
  try {
    const dossier = await Dossier.findById(req.params.id);
    if (!dossier) {
      return res.status(404).json({ message: 'Dossier not found' });
    }

    if (req.user.role === 'technician' && dossier.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { customerDetails, pvSystemParams, status, assignedTechnician } = req.body;

    if (customerDetails) dossier.customerDetails = customerDetails;
    if (pvSystemParams) {
      dossier.pvSystemParams = pvSystemParams;
      dossier.calculations = calculatePVMetrics(pvSystemParams);
    }
    if (status) dossier.status = status;
    if (assignedTechnician && req.user.role === 'admin') dossier.assignedTechnician = assignedTechnician;
    dossier.updatedAt = new Date();

    const updated = await dossier.save();
    const populated = await updated.populate('createdBy', 'name email').populate('assignedTechnician', 'name email');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/dossiers/:id', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const dossier = await Dossier.findByIdAndDelete(req.params.id);
    if (!dossier) {
      return res.status(404).json({ message: 'Dossier not found' });
    }
    res.json({ message: 'Dossier deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// FILE UPLOAD ROUTES
// ============================================

app.post('/api/dossiers/:id/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const dossier = await Dossier.findById(req.params.id);
    if (!dossier) {
      return res.status(404).json({ message: 'Dossier not found' });
    }

    if (req.user.role === 'client' && dossier.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    dossier.documents.push({
      fileName: req.file.originalname,
      fileUrl: `/uploads/${req.file.filename}`,
      fileType: path.extname(req.file.originalname)
    });

    const updated = await dossier.save();
    res.json({ message: 'File uploaded', document: updated.documents[updated.documents.length - 1] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/dossiers/:id/documents/:docIndex', authMiddleware, async (req, res) => {
  try {
    const dossier = await Dossier.findById(req.params.id);
    if (!dossier) {
      return res.status(404).json({ message: 'Dossier not found' });
    }

    if (req.user.role === 'client' && dossier.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const docIndex = parseInt(req.params.docIndex);
    if (docIndex < 0 || docIndex >= dossier.documents.length) {
      return res.status(400).json({ message: 'Invalid document index' });
    }

    const filePath = path.join('uploads', dossier.documents[docIndex].fileUrl.split('/').pop());
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    dossier.documents.splice(docIndex, 1);
    await dossier.save();

    res.json({ message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// AI DATASHEET SCANNING & STEG PDF GENERATION
// ============================================

app.post('/api/dossiers/:id/scan-equipment', authMiddleware, upload.single('datasheet'), async (req, res) => {
  try {
    const dossier = await Dossier.findById(req.params.id);
    if (!dossier) {
      return res.status(404).json({ message: 'Dossier not found' });
    }

    if (req.user.role === 'client' && dossier.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No datasheet PDF uploaded' });
    }

    // Read PDF file
    const filePath = req.file.path;
    const fileBuffer = fs.readFileSync(filePath);

    // Scan with AI
    const scannedData = await scanDatasheet(fileBuffer, req.file.originalname);

    if (!scannedData.success) {
      return res.status(400).json({ message: 'Failed to scan datasheet', error: scannedData.error });
    }

    // Update equipment in dossier based on category
    const { category, brand, model, specs } = scannedData;
    if (category === 'PANEL') {
      dossier.equipment.panel = { brand, model, specs };
    } else if (category === 'INVERTER') {
      dossier.equipment.inverter = { brand, model, specs };
    } else if (category === 'PROTECTION_DC') {
      dossier.equipment.dcProtection = { brand, model, specs };
    } else if (category === 'PROTECTION_AC') {
      dossier.equipment.acProtection = { brand, model, specs };
    } else if (category === 'CABLE') {
      if (req.body.cableType === 'AC') {
        dossier.equipment.acCable = { brand, specs };
      } else {
        dossier.equipment.dcCable = { brand, specs };
      }
    }

    dossier.updatedAt = new Date();
    const updated = await dossier.save();

    res.json({
      message: 'Equipment specs extracted',
      scannedData,
      dossier: updated
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/dossiers/:id/compliance', authMiddleware, async (req, res) => {
  try {
    const dossier = await Dossier.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignedTechnician', 'name email');

    if (!dossier) {
      return res.status(404).json({ message: 'Dossier not found' });
    }

    if (req.user.role === 'client' && dossier.createdBy._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const complianceReport = computeStegCompliance(dossier);
    res.json(complianceReport);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/dossiers/:id/export-pdf', authMiddleware, async (req, res) => {
  try {
    const dossier = await Dossier.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignedTechnician', 'name email');

    if (!dossier) {
      return res.status(404).json({ message: 'Dossier not found' });
    }

    // Only admin, technician, or dossier owner can export
    if (req.user.role === 'client' && dossier.createdBy._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Compute STEG compliance
    const complianceReport = computeStegCompliance(dossier);
    
    // Save compliance report to dossier
    dossier.complianceReport = complianceReport;
    await dossier.save();

    // Generate PDF
    const pdfBuffer = await generateStegPDF(dossier, complianceReport);

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="STEG_Dossier_${dossier._id}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ message: 'Failed to generate PDF', error: error.message });
  }
});

// ============================================
// ITEMS ROUTES (backward compatibility)
// ============================================

app.get('/items', authMiddleware, async (req, res) => {
  try {
    const storedItems = await Item.find().sort({ createdAt: -1 });
    res.json(storedItems);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/items', authMiddleware, async (req, res) => {
  try {
    const savedItem = await Item.create({
      name: req.body.name,
      description: req.body.description,
      owner: req.user.id
    });
    res.status(201).json(savedItem);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ============================================
// DATABASE CONNECTION & SERVER START
// ============================================

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(port, () => console.log(`API running on http://localhost:${port}`));
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  });
