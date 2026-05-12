import express from 'express';
import { ProductModel } from '../db.js';
import { nanoid } from 'nanoid';
import { AuthRequest } from '../middleware/auth.js';

const router = express.Router();

router.get('/products', async (req: AuthRequest, res) => {
  const products = await ProductModel.find({ tenantId: req.user?.tenantId });
  res.json(products);
});

router.get('/product/barcode/:code', async (req: AuthRequest, res) => {
  const product = await ProductModel.findOne({ barcode: req.params.code, tenantId: req.user?.tenantId });
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
});

router.post('/product', async (req: AuthRequest, res) => {
  const { name, price, stock, category, hsnCode, gstRate, barcode } = req.body;

  const newProduct = {
    id: nanoid(),
    name,
    price,
    stock,
    category,
    hsnCode: hsnCode || '',
    gstRate: gstRate || 0,
    barcode: barcode || '',
    tenantId: req.user!.tenantId
  };

  const product = await ProductModel.create(newProduct);
  res.json(product);
});

router.put('/product/:id', async (req: AuthRequest, res) => {
  const product = await ProductModel.findOneAndUpdate(
    { id: req.params.id, tenantId: req.user?.tenantId },
    { $set: req.body },
    { new: true }
  );

  if (!product) return res.status(404).json({ message: 'Product not found' });

  res.json(product);
});

router.delete('/product/:id', async (req: AuthRequest, res) => {
  await ProductModel.deleteOne({ id: req.params.id, tenantId: req.user?.tenantId });
  res.json({ message: 'Product deleted' });
});

export default router;
