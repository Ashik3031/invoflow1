import express from 'express';
import { getDb } from '../db.js';
import { nanoid } from 'nanoid';
import { AuthRequest } from '../middleware/auth.js';

const router = express.Router();

router.get('/products', async (req: AuthRequest, res) => {
  const db = await getDb();
  const products = db.data.products.filter(p => p.tenantId === req.user?.tenantId);
  res.json(products);
});

router.post('/product', async (req: AuthRequest, res) => {
  const { name, price, stock, category } = req.body;
  const db = await getDb();

  const newProduct = {
    id: nanoid(),
    name,
    price,
    stock,
    category,
    tenantId: req.user!.tenantId
  };

  db.data.products.push(newProduct);
  await db.write();
  res.json(newProduct);
});

router.put('/product/:id', async (req: AuthRequest, res) => {
  const db = await getDb();
  const index = db.data.products.findIndex(p => p.id === req.params.id && p.tenantId === req.user?.tenantId);

  if (index === -1) return res.status(404).json({ message: 'Product not found' });

  db.data.products[index] = { ...db.data.products[index], ...req.body };
  await db.write();
  res.json(db.data.products[index]);
});

router.delete('/product/:id', async (req: AuthRequest, res) => {
  const db = await getDb();
  db.data.products = db.data.products.filter(p => !(p.id === req.params.id && p.tenantId === req.user?.tenantId));
  await db.write();
  res.json({ message: 'Product deleted' });
});

export default router;
