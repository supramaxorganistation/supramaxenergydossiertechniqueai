import dns from 'dns';

// Force Node.js to use reliable external DNS servers instead of 127.0.0.1.
// This fixes MongoDB Atlas SRV resolution failures on Windows (querySrv ECONNREFUSED).
dns.setServers(['8.8.8.8', '1.1.1.1']);

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { scanDatasheet } from './services/aiScanner.js';
import { computeStegCompliance } from './utils/stegCalculations.js';
import { generateStegPDF } from './services/pdfGenerator.js';
import { generateStegDOCX } from './services/docxTemplateFiller.js';
import { erpRouter } from './erpRoutes.js';

// Load config from the single root .env (monorepo root)
const __serverDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__serverDir, '..', '.env') });

const app = express();
const port = process.env.PORT || 5000;
const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-me';

// --- reCAPTCHA ---
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY || '';

// --- Google OAuth ---
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

// --- Admin email for forgot-password notifications ---
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@supramax.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// --- SMTP transporter for emails ---
let mailTransporter = null;
if (process.env.SMTP_HOST) {
  mailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

// --- WebAuthn config ---
const rpName = 'Supramax Energy';
const rpID = 'localhost';
const origin = 'http://localhost:5173';

// In-memory store for WebAuthn challenges (use DB in production)
const webauthnChallenges = new Map();

app.use(cors({
  exposedHeaders: ['Content-Disposition'],
}));
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
  passwordHash: { type: String, required: false },
  role: { type: String, enum: ['admin', 'technician', 'client'], default: 'technician' },
  googleId: { type: String, unique: true, sparse: true },
  passwordResetToken: String,
  passwordResetExpires: Date,
  webauthnCredentials: [{
    id: String,
    publicKey: Buffer,
    counter: Number,
    transports: [String],
    createdAt: { type: Date, default: Date.now }
  }],
  // 128-dim face embedding captured from the webcam scanner (face-api.js)
  faceDescriptor: [Number],
  createdAt: { type: Date, default: Date.now }
});

const dossierSchema = new mongoose.Schema({
  customerDetails: {
    name: { type: String, required: true },
    cin: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    stegMeterRef: { type: String, required: true },
    gpsLatitude: Number,
    gpsLongitude: Number,
    gpsAltitude: Number
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

const equipmentSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['PANEL', 'INVERTER', 'PROTECTION_DC', 'PROTECTION_AC', 'CABLE'],
    required: true
  },
  brand: String,
  model: String,
  specs: mongoose.Schema.Types.Mixed,
  fileName: String,
  fileUrl: String,
  cableType: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Dossier = mongoose.model('Dossier', dossierSchema);
const Item = mongoose.model('Item', itemSchema);
const Equipment = mongoose.model('Equipment', equipmentSchema);

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
    const { email, password, recaptchaToken } = req.body;

    // Verify reCAPTCHA
    if (RECAPTCHA_SECRET && recaptchaToken) {
      const recaptchaRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${RECAPTCHA_SECRET}&response=${recaptchaToken}`,
      });
      const recaptchaData = await recaptchaRes.json();
      if (!recaptchaData.success) {
        return res.status(400).json({ message: 'reCAPTCHA verification failed. Please try again.' });
      }
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (!user.passwordHash) {
      return res.status(401).json({ message: 'This account uses social login. Please sign in with Google or Face ID.' });
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
      user: { id: user._id, name: user.name, email: user.email, role: user.role, hasFace: !!(user.faceDescriptor && user.faceDescriptor.length === 128), createdAt: user.createdAt }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// AUTH EXTENSIONS
// ============================================

// Euclidean distance between two face descriptors (match if < 0.6)
function faceDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = (a[i] || 0) - (b[i] || 0);
    sum += d * d;
  }
  return Math.sqrt(sum);
}

// --- Face ID login: match a captured descriptor against enrolled faces ---
app.post('/auth/face-login', async (req, res) => {
  try {
    const { descriptor } = req.body;
    if (!Array.isArray(descriptor) || descriptor.length !== 128) {
      return res.status(400).json({ message: 'Descripteur facial invalide' });
    }

    const users = await User.find({ faceDescriptor: { $exists: true, $not: { $size: 0 } } });
    let bestUser = null;
    let bestDist = Infinity;
    for (const u of users) {
      if (!u.faceDescriptor || u.faceDescriptor.length !== 128) continue;
      const d = faceDistance(descriptor, u.faceDescriptor);
      if (d < bestDist) { bestDist = d; bestUser = u; }
    }

    if (!bestUser || bestDist > 0.5) {
      return res.status(401).json({ message: 'Visage non reconnu. Enregistrez votre visage depuis le gestionnaire de comptes.' });
    }

    res.json({
      token: signToken(bestUser),
      user: { id: bestUser._id, name: bestUser.name, email: bestUser.email, role: bestUser.role }
    });
  } catch (error) {
    console.error('Face login error:', error);
    res.status(500).json({ message: error.message });
  }
});

// --- Face ID enrollment: admin can enroll anyone, users can enroll themselves ---
app.post('/auth/face-register', authMiddleware, async (req, res) => {
  try {
    const { userId, descriptor } = req.body;
    if (!Array.isArray(descriptor) || descriptor.length !== 128) {
      return res.status(400).json({ message: 'Descripteur facial invalide' });
    }
    const targetId = userId || req.user.id;
    if (targetId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const user = await User.findById(targetId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.faceDescriptor = descriptor;
    await user.save();
    res.json({ message: 'Visage enregistré avec succès.', hasFace: true });
  } catch (error) {
    console.error('Face register error:', error);
    res.status(500).json({ message: error.message });
  }
});

// --- reCAPTCHA site key (public, safe to expose) ---
app.get('/auth/recaptcha-key', (req, res) => {
  res.json({ siteKey: process.env.RECAPTCHA_SITE_KEY || '' });
});

// --- Google OAuth Client ID (public) ---
app.get('/auth/google-config', (req, res) => {
  res.json({ clientId: GOOGLE_CLIENT_ID });
});

// --- Forgot Password: send reset link to the user's own email ---
app.post('/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal whether an account exists for this email
      return res.json({ message: 'Si cet email existe, un lien de réinitialisation lui a été envoyé.' });
    }

    if (!mailTransporter) {
      return res.status(500).json({ message: 'Service email non configuré (SMTP manquant).' });
    }

    // Generate a reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    // Send the reset link directly to the account owner
    await mailTransporter.sendMail({
      from: process.env.SMTP_USER || ADMIN_EMAIL,
      to: user.email,
      subject: '[Supramax Energy] Réinitialisation de votre mot de passe',
      html: `<h3>Bonjour ${user.name},</h3>
        <p>Vous avez demandé la réinitialisation de votre mot de passe Supramax Energy.</p>
        <p>Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe (lien valable 1 heure) :</p>
        <a href="${FRONTEND_URL}/#/reset-password/${resetToken}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;">Réinitialiser mon mot de passe</a>
        <p style="margin-top:16px;color:#666;">Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email — votre mot de passe restera inchangé.</p>`,
    });

    res.json({ message: 'Si cet email existe, un lien de réinitialisation lui a été envoyé.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: error.message });
  }
});

// --- Reset Password (admin link) ---
app.post('/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ message: 'Token and new password are required' });
    if (newPassword.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ passwordResetToken: hashedToken, passwordResetExpires: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ message: 'Invalid or expired reset token' });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- Google OAuth Login ---
app.post('/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ message: 'Google credential is required' });

    // Verify Google ID token
    const tokenRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!tokenRes.ok) return res.status(401).json({ message: 'Invalid Google credential' });
    const payload = await tokenRes.json();

    // Verify audience matches our client ID
    if (GOOGLE_CLIENT_ID && payload.aud !== GOOGLE_CLIENT_ID) {
      return res.status(401).json({ message: 'Google credential audience mismatch' });
    }

    const { sub: googleId, email, name, picture } = payload;

    let user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      // Link Google account if not already linked
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
    } else {
      // Auto-create user from Google
      user = await User.create({
        name: name || email,
        email: email.toLowerCase(),
        googleId,
        role: 'client',
      });
    }

    res.json({
      token: signToken(user),
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- WebAuthn: Registration Options ---
app.post('/auth/webauthn/register-options', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const existingCreds = (user.webauthnCredentials || []).map((c) => ({
      id: isoBase64URL.toBuffer(c.id),
      transports: c.transports,
    }));

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: isoBase64URL.toBuffer(user._id.toString()),
      userName: user.email,
      userDisplayName: user.name,
      attestationType: 'none',
      excludeCredentials: existingCreds,
      authenticatorSelection: { userVerification: 'preferred' },
    });

    webauthnChallenges.set(user._id.toString(), options.challenge);
    res.json(options);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- WebAuthn: Registration Verification ---
app.post('/auth/webauthn/register-verify', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const expectedChallenge = webauthnChallenges.get(user._id.toString());
    if (!expectedChallenge) return res.status(400).json({ message: 'No challenge found. Start registration first.' });

    const verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (!verification.verified) return res.status(400).json({ message: 'Verification failed' });

    const { credential } = verification.registrationInfo;
    user.webauthnCredentials.push({
      id: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: credential.counter,
      transports: req.body.response?.transports || [],
    });
    await user.save();
    webauthnChallenges.delete(user._id.toString());

    res.json({ message: 'Biometric authentication registered successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- WebAuthn: Authentication Options ---
app.post('/auth/webauthn/auth-options', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.webauthnCredentials?.length) {
      return res.status(404).json({ message: 'No biometric credentials found for this account. Register Face ID first.' });
    }

    const allowCredentials = user.webauthnCredentials.map((c) => ({
      id: isoBase64URL.toBuffer(c.id),
      type: 'public-key',
      transports: c.transports || [],
    }));

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: 'preferred',
    });

    webauthnChallenges.set(`auth-${user._id}`, options.challenge);
    res.json({ ...options, userId: user._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- WebAuthn: Authentication Verification ---
app.post('/auth/webauthn/auth-verify', async (req, res) => {
  try {
    const { userId, credential } = req.body;
    if (!userId || !credential) return res.status(400).json({ message: 'Missing data' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const expectedChallenge = webauthnChallenges.get(`auth-${user._id}`);
    if (!expectedChallenge) return res.status(400).json({ message: 'No challenge found. Start authentication first.' });

    const dbCred = user.webauthnCredentials.find((c) => c.id === credential.id);
    if (!dbCred) return res.status(400).json({ message: 'Credential not recognized' });

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: dbCred.id,
        publicKey: dbCred.publicKey,
        counter: dbCred.counter,
      },
    });

    if (!verification.verified) return res.status(401).json({ message: 'Biometric verification failed' });

    // Update counter
    dbCred.counter = verification.authenticationInfo.newCounter;
    await user.save();
    webauthnChallenges.delete(`auth-${user._id}`);

    res.json({
      token: signToken(user),
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- Check if user has WebAuthn credentials ---
app.post('/auth/webauthn/has-credentials', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    const user = await User.findOne({ email: email.toLowerCase() });
    res.json({ hasCredentials: !!(user && user.webauthnCredentials && user.webauthnCredentials.length > 0) });
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
        hasFace: !!(u.faceDescriptor && u.faceDescriptor.length === 128),
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
      hasFace: !!(user.faceDescriptor && user.faceDescriptor.length === 128),
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
    const { customerDetails, pvSystemParams, equipment } = req.body;

    if (!customerDetails || !pvSystemParams) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const calculations = calculatePVMetrics(pvSystemParams);

    const newDossier = await Dossier.create({
      customerDetails,
      pvSystemParams,
      equipment: equipment || {},
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

    const { customerDetails, pvSystemParams, status, assignedTechnician, equipment } = req.body;

    if (customerDetails) dossier.customerDetails = customerDetails;
    if (pvSystemParams) {
      dossier.pvSystemParams = pvSystemParams;
      dossier.calculations = calculatePVMetrics(pvSystemParams);
    }
    if (equipment) dossier.equipment = equipment;
    if (status) dossier.status = status;
    if (assignedTechnician && req.user.role === 'admin') dossier.assignedTechnician = assignedTechnician;
    dossier.updatedAt = new Date();

    const updated = await dossier.save();
    await updated.populate('createdBy', 'name email');
    await updated.populate('assignedTechnician', 'name email');
    res.json(updated);
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

// ============================================
// EQUIPMENT CATALOG (datasheets + extracted specs)
// ============================================

app.post('/api/equipment/scan', authMiddleware, upload.single('datasheet'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No datasheet PDF uploaded' });
    }

    const fileBuffer = fs.readFileSync(req.file.path);
    const scannedData = await scanDatasheet(fileBuffer, req.file.originalname);

    if (!scannedData.success) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Failed to scan datasheet', error: scannedData.error });
    }

    const validCategories = ['PANEL', 'INVERTER', 'PROTECTION_DC', 'PROTECTION_AC', 'CABLE'];
    if (!validCategories.includes(scannedData.category)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        message: "Le document ne semble pas être une fiche technique d'équipement (panneau, onduleur, protection ou câble).",
        category: scannedData.category
      });
    }

    const equipment = await Equipment.create({
      category: scannedData.category,
      brand: scannedData.brand,
      model: scannedData.model,
      specs: scannedData.specs,
      fileName: req.file.originalname,
      fileUrl: `/uploads/${req.file.filename}`,
      cableType: req.body.cableType || null,
      createdBy: req.user.id
    });

    res.status(201).json({ message: 'Equipment saved to catalog', equipment, scannedData });
  } catch (error) {
    console.error('Equipment scan error:', error);
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/equipment', authMiddleware, async (req, res) => {
  try {
    const items = await Equipment.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/equipment/:id', authMiddleware, authorizeRoles('admin', 'technician'), async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    const filePath = path.join('uploads', equipment.fileUrl.split('/').pop());
    if (equipment.fileUrl && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await Equipment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Equipment deleted' });
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

    // Generate PDF (annexes = documents téléversés du dossier)
    const pdfBuffer = await generateStegPDF(dossier, complianceReport, dossier.documents || []);

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

// ── DOCX EXPORT ───────────────────────────────────────────────────────
app.get('/api/dossiers/:id/export-docx', authMiddleware, async (req, res) => {
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

    // Generate DOCX
    const docxBuffer = await generateStegDOCX(dossier, complianceReport);

    // Determine filename
    const ref = dossier.customerDetails?.stegMeterRef || dossier._id;
    const filename = `Dossier_Technique_${ref}.docx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', docxBuffer.length);
    res.send(docxBuffer);
  } catch (error) {
    console.error('DOCX generation error:', error);
    res.status(500).json({ message: 'Failed to generate DOCX', error: error.message });
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
// ERP MODULE ROUTES
// ============================================

app.use('/erp', authMiddleware, erpRouter);

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
