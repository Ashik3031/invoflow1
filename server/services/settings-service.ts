import express from 'express';
import { TenantModel } from '../db.js';
import { AuthRequest } from '../middleware/auth.js';

const router = express.Router();

router.get('/tenant', async (req: AuthRequest, res) => {
  const tenant = await TenantModel.findOne({ id: req.user?.tenantId });
  if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
  res.json(tenant);
});

router.put('/tenant', async (req: AuthRequest, res) => {
  const tenant = await TenantModel.findOneAndUpdate(
    { id: req.user?.tenantId },
    { $set: req.body },
    { new: true }
  );
  if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

  res.json(tenant);
});

export default router;
