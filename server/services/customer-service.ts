import express from 'express';
import { CustomerModel, BillModel } from '../db.js';
import { nanoid } from 'nanoid';
import { AuthRequest } from '../middleware/auth.js';
import { createNotification } from './notification-service.js';

const router = express.Router();

router.get('/list', async (req: AuthRequest, res) => {
  const customers = await CustomerModel.find({ tenantId: req.user?.tenantId });
  res.json(customers);
});

router.get('/:id/history', async (req: AuthRequest, res) => {
  const bills = await BillModel.find({ customerId: req.params.id, tenantId: req.user?.tenantId });
  res.json(bills);
});

router.put('/:id/notes', async (req: AuthRequest, res) => {
  const customer = await CustomerModel.findOneAndUpdate(
    { id: req.params.id, tenantId: req.user?.tenantId },
    { $set: { notes: req.body.notes } },
    { new: true }
  );
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  res.json(customer);
});

router.post('/create', async (req: AuthRequest, res) => {
  const { name, phone } = req.body;

  const existing = await CustomerModel.findOne({ phone, tenantId: req.user?.tenantId });
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

  const customer = await CustomerModel.create(newCustomer);

  await createNotification(
    req.user!.tenantId,
    'New Customer Registered',
    `Customer "${customer.name}" (${customer.phone}) has been registered.`,
    'customer'
  );

  res.json(customer);
});

export default router;
