import express from 'express';
import { getDb } from '../db.js';
import { nanoid } from 'nanoid';
import { AuthRequest } from '../middleware/auth.js';

const router = express.Router();

router.get('/list', async (req: AuthRequest, res) => {
  const db = await getDb();
  const customers = db.data.customers.filter(c => c.tenantId === req.user?.tenantId);
  res.json(customers);
});

router.get('/:id/history', async (req: AuthRequest, res) => {
  const db = await getDb();
  const bills = db.data.bills.filter(b => b.customerId === req.params.id && b.tenantId === req.user?.tenantId);
  res.json(bills);
});

router.put('/:id/notes', async (req: AuthRequest, res) => {
  const db = await getDb();
  const customer = db.data.customers.find(c => c.id === req.params.id && c.tenantId === req.user?.tenantId);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  customer.notes = req.body.notes;
  await db.write();
  res.json(customer);
});

router.post('/create', async (req: AuthRequest, res) => {
  const { name, phone } = req.body;
  const db = await getDb();

  const existing = db.data.customers.find(c => c.phone === phone && c.tenantId === req.user?.tenantId);
  if (existing) return res.json(existing);

  const newCustomer = {
    id: nanoid(),
    name,
    phone,
    tenantId: req.user!.tenantId,
    notes: '',
    totalSpent: 0,
    totalOrders: 0,
    loyaltyPoints: 0
  };

  db.data.customers.push(newCustomer);
  await db.write();
  res.json(newCustomer);
});

export default router;
