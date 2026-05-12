import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { UserModel, TenantModel } from '../db.js';
import { nanoid } from 'nanoid';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'xyraco-secret-key';

router.post('/signup', async (req, res) => {
  const { name, email, password, shopName } = req.body;

  const existingUser = await UserModel.findOne({ email });
  if (existingUser) return res.status(400).json({ message: 'User already exists' });

  const tenantId = nanoid();
  const userId = nanoid();
  const passwordHash = await bcrypt.hash(password, 10);

  const slug = shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  
  await TenantModel.create({ id: tenantId, shopName, ownerId: userId, slug });
  await UserModel.create({ id: userId, name, email, passwordHash, tenantId, role: 'admin' });

  res.json({ message: 'Account created successfully' });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await UserModel.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { userId: user.id, tenantId: user.tenantId, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const tenant = await TenantModel.findOne({ id: user.tenantId });

  res.json({ token, user: { id: user.id, name: user.name, tenantId: user.tenantId }, tenant });
});

export default router;
