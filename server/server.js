import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-me';

app.use(cors());
app.use(express.json());

let items = [];
let users = [];
let useMemoryStore = false;

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Item = mongoose.model('Item', itemSchema);
const User = mongoose.model('User', userSchema);

const signToken = (user) => jwt.sign({ id: user._id?.toString() || user.id, email: user.email }, jwtSecret, { expiresIn: '7d' });

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

const findUserByEmail = async (email) => {
  if (useMemoryStore) {
    return users.find((user) => user.email === email);
  }

  return User.findOne({ email });
};

const createUser = async (userData) => {
  if (useMemoryStore) {
    const newUser = {
      id: `${Date.now()}`,
      ...userData,
      createdAt: new Date()
    };
    users = [newUser, ...users];
    return newUser;
  }

  const user = new User(userData);
  return user.save();
};

const saveItem = async (itemData) => {
  if (useMemoryStore) {
    const newItem = { _id: `${Date.now()}`, ...itemData };
    items = [newItem, ...items];
    return newItem;
  }

  const item = new Item(itemData);
  return item.save();
};

const getItems = async () => {
  if (useMemoryStore) {
    return items;
  }

  return Item.find().sort({ createdAt: -1 });
};

app.get('/health', (req, res) => {
  res.json({ status: 'ok', database: useMemoryStore ? 'memory' : 'mongodb' });
});

app.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const existingUser = await findUserByEmail(email.toLowerCase());
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await createUser({
      name,
      email: email.toLowerCase(),
      passwordHash
    });

    res.status(201).json({
      token: signToken(newUser),
      user: { id: newUser.id || newUser._id, name: newUser.name, email: newUser.email }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await findUserByEmail(email.toLowerCase());
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    res.json({
      token: signToken(user),
      user: { id: user.id || user._id, name: user.name, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

app.get('/items', authMiddleware, async (req, res) => {
  try {
    const storedItems = await getItems();
    res.json(storedItems);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/items', authMiddleware, async (req, res) => {
  try {
    const savedItem = await saveItem({
      name: req.body.name,
      description: req.body.description,
      owner: req.user.id
    });
    res.status(201).json(savedItem);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(port, () => console.log(`API running on http://localhost:${port}`));
  })
  .catch((error) => {
    useMemoryStore = true;
    console.warn('MongoDB not available, using memory store:', error.message);
    app.listen(port, () => console.log(`API running on http://localhost:${port}`));
  });
