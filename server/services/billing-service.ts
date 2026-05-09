import express from 'express';
import { getDb } from '../db.js';
import { nanoid } from 'nanoid';
import { AuthRequest } from '../middleware/auth.js';

const router = express.Router();

router.get('/list', async (req: AuthRequest, res) => {
  const db = await getDb();
  const bills = db.data.bills
    .filter(b => b.tenantId === req.user?.tenantId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(bills);
});

router.post('/create', async (req: AuthRequest, res) => {
  const { customerName, customerPhone, items, paymentStatus, discountAmount = 0, pointsRedeemed = 0 } = req.body;
  const db = await getDb();
  const tenantId = req.user!.tenantId;

  // 1. Handle Customer
  let customerId = undefined;
  let customer = null;
  if (customerPhone) {
    customer = db.data.customers.find(c => c.phone === customerPhone && c.tenantId === tenantId);
    if (!customer) {
      customer = { 
        id: nanoid(), 
        name: customerName || 'Walk-in', 
        phone: customerPhone, 
        tenantId,
        notes: '',
        totalSpent: 0,
        totalOrders: 0,
        loyaltyPoints: 0
      };
      db.data.customers.push(customer);
    }
    customerId = customer.id;
  }

  // 2. Calculate Total & Update Stock
  let subtotal = 0;
  for (const item of items) {
    const product = db.data.products.find(p => p.id === item.productId && p.tenantId === tenantId);
    if (product) {
      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
      }
      product.stock -= item.quantity;
      subtotal += item.price * item.quantity;
    }
  }

  const finalAmount = Math.max(0, subtotal - discountAmount);

  // 3. Loyalty Logic
  if (customer) {
    const config = db.data.loyaltyConfigs?.find(c => c.tenantId === tenantId);
    if (config?.enabled) {
      // Deduct points
      if (pointsRedeemed > 0) {
        if (customer.loyaltyPoints < pointsRedeemed) {
          return res.status(400).json({ message: 'Insufficient loyalty points' });
        }
        customer.loyaltyPoints -= pointsRedeemed;
      }
      // Earn points (on final amount)
      const earned = Math.floor(finalAmount * config.pointsPerRupee);
      customer.loyaltyPoints += earned;
    }

    // CRM Updates
    customer.totalSpent += finalAmount;
    customer.totalOrders += 1;
    customer.lastPurchaseDate = new Date().toISOString();
  }

  // 4. Create Bill
  const billCount = db.data.bills.filter(b => b.tenantId === tenantId).length + 1;
  const billNumber = `INV-${new Date().getFullYear()}-${billCount.toString().padStart(4, '0')}`;

  const newBill = {
    id: nanoid(),
    billNumber,
    customerId,
    items,
    totalAmount: finalAmount,
    discountAmount,
    pointsRedeemed,
    paymentStatus: paymentStatus || 'paid',
    tenantId,
    createdAt: new Date().toISOString()
  };

  db.data.bills.push(newBill);
  await db.write();

  res.json(newBill);
});

router.get('/dashboard', async (req: AuthRequest, res) => {
  const db = await getDb();
  const tenantId = req.user!.tenantId;
  const today = new Date().toISOString().split('T')[0];

  const bills = db.data.bills.filter(b => b.tenantId === tenantId);
  const todayBills = bills.filter(b => b.createdAt.startsWith(today));
  
  const totalSales = todayBills.reduce((acc, b) => acc + b.totalAmount, 0);
  const pendingPayments = bills.filter(b => b.paymentStatus === 'unpaid').length;
  const lowStockItems = db.data.products.filter(p => p.tenantId === tenantId && p.stock < 10).length;

  // New Insights
  const bestCustomers = [...db.data.customers]
    .filter(c => c.tenantId === tenantId)
    .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
    .slice(0, 5);

  const productPerformance = new Map<string, { name: string, quantity: number, revenue: number }>();
  bills.forEach(b => {
    b.items.forEach(item => {
      const p = db.data.products.find(prod => prod.id === item.productId);
      const current = productPerformance.get(item.productId) || { name: p?.name || 'Unknown', quantity: 0, revenue: 0 };
      current.quantity += item.quantity;
      current.revenue += item.quantity * item.price;
      productPerformance.set(item.productId, current);
    });
  });

  const topProducts = Array.from(productPerformance.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  res.json({
    todaySales: totalSales,
    todayBillCount: todayBills.length,
    pendingPayments,
    lowStockItems,
    bestCustomers,
    topProducts
  });
});

export default router;
