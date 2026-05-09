import express from 'express';
import { getDb } from '../db.js';
import { nanoid } from 'nanoid';
import { AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Loyalty Config
router.get('/loyalty/config', async (req: AuthRequest, res) => {
  const db = await getDb();
  let config = db.data.loyaltyConfigs.find(c => c.tenantId === req.user?.tenantId);
  if (!config) {
    config = { 
      tenantId: req.user!.tenantId, 
      pointsPerRupee: 0.01, 
      minRedeemPoints: 100, 
      valuePerPoint: 1, 
      enabled: false 
    };
    db.data.loyaltyConfigs.push(config);
    await db.write();
  }
  res.json(config);
});

router.post('/loyalty/config', async (req: AuthRequest, res) => {
  const db = await getDb();
  const index = db.data.loyaltyConfigs.findIndex(c => c.tenantId === req.user?.tenantId);
  const newConfig = { ...req.body, tenantId: req.user!.tenantId };
  
  if (index > -1) {
    db.data.loyaltyConfigs[index] = newConfig;
  } else {
    db.data.loyaltyConfigs.push(newConfig);
  }
  
  await db.write();
  res.json(newConfig);
});

// Coupons
router.get('/coupons', async (req: AuthRequest, res) => {
  const db = await getDb();
  const coupons = db.data.coupons.filter(c => c.tenantId === req.user?.tenantId);
  res.json(coupons);
});

router.post('/coupons/create', async (req: AuthRequest, res) => {
  const db = await getDb();
  const coupon = {
    ...req.body,
    id: nanoid(),
    tenantId: req.user!.tenantId,
    active: true
  };
  db.data.coupons.push(coupon);
  await db.write();
  res.json(coupon);
});

router.delete('/coupons/:id', async (req: AuthRequest, res) => {
  const db = await getDb();
  db.data.coupons = db.data.coupons.filter(c => c.id !== req.params.id || c.tenantId !== req.user?.tenantId);
  await db.write();
  res.json({ success: true });
});

export default router;
