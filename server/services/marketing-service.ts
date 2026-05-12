import express from 'express';
import { LoyaltyConfigModel, CouponModel } from '../db.js';
import { nanoid } from 'nanoid';
import { AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Loyalty Config
router.get('/loyalty/config', async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  let config = await LoyaltyConfigModel.findOne({ tenantId });
  if (!config) {
    config = await LoyaltyConfigModel.create({ 
      tenantId, 
      pointsPerRupee: 0.01, 
      minRedeemPoints: 100, 
      valuePerPoint: 1, 
      enabled: false 
    });
  }
  res.json(config);
});

router.post('/loyalty/config', async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const config = await LoyaltyConfigModel.findOneAndUpdate(
    { tenantId },
    { $set: { ...req.body, tenantId } },
    { upsert: true, new: true }
  );
  res.json(config);
});

// Coupons
router.get('/coupons', async (req: AuthRequest, res) => {
  const coupons = await CouponModel.find({ tenantId: req.user?.tenantId });
  res.json(coupons);
});

router.post('/coupons/create', async (req: AuthRequest, res) => {
  const coupon = await CouponModel.create({
    ...req.body,
    id: nanoid(),
    tenantId: req.user!.tenantId,
    active: true
  });
  res.json(coupon);
});

router.delete('/coupons/:id', async (req: AuthRequest, res) => {
  await CouponModel.deleteOne({ id: req.params.id, tenantId: req.user?.tenantId });
  res.json({ success: true });
});

export default router;
