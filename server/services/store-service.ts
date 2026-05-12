import express from 'express';
import { TenantModel, ProductModel } from '../db.js';

const router = express.Router();

// Public route - no AuthRequest needed
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;

  const tenant = await TenantModel.findOne({ slug });
  if (!tenant) return res.status(404).json({ message: 'Store not found' });

  const productsRaw = await ProductModel.find({ tenantId: tenant.id, stock: { $gt: 0 } });
  const products = productsRaw.map(p => ({
    id: p.id,
    name: p.name,
    price: p.price,
    category: p.category,
    stock: p.stock
  }));

  res.json({
    shopName: tenant.shopName,
    products
  });
});

export default router;
