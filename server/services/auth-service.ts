import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getDb } from '../db.js';
import { nanoid } from 'nanoid';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'xyraco-secret-key';

router.post('/signup', async (req, res) => {
  const { name, email, password, shopName } = req.body;
  const db = await getDb();

  const existingUser = db.data.users.find(u => u.email === email);
  if (existingUser) return res.status(400).json({ message: 'User already exists' });

  const tenantId = nanoid();
  const userId = nanoid();
  const passwordHash = await bcrypt.hash(password, 10);

  const newUser = { id: userId, name, email, passwordHash, tenantId, role: 'admin' as const };
  const newTenant = { id: tenantId, shopName, ownerId: userId };

  db.data.users.push(newUser);
  db.data.tenants.push(newTenant);
  await db.write();

  res.json({ message: 'Account created successfully' });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const db = await getDb();

  const user = db.data.users.find(u => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { userId: user.id, tenantId: user.tenantId, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token, user: { id: user.id, name: user.name, tenantId: user.tenantId } });
});

export default router;
