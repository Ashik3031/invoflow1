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
  try {
    const { tenantId } = req.user!;
    const tenant = await TenantModel.findOne({ id: tenantId });
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    const { shopName, slug, gstin, state, businessType } = req.body;
    
    if (shopName) tenant.shopName = shopName;
    if (slug) tenant.slug = slug;
    if (gstin !== undefined) tenant.gstin = gstin;
    if (state !== undefined) tenant.state = state;
    if (businessType !== undefined) tenant.businessType = businessType;

    const savedTenant = await tenant.save();
    res.json(savedTenant);
  } catch (err: any) {
    console.error('Failed to save settings:', err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

export default router;
