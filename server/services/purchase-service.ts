import express from 'express';
import { 
  SupplierModel, 
  PurchaseBillModel, 
  ProductModel, 
  PaymentModel, 
  CashBookModel, 
  ExpenseModel 
} from '../db.js';
import { nanoid } from 'nanoid';
import { AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// --- Suppliers ---

router.get('/suppliers', async (req: AuthRequest, res) => {
  const suppliers = await SupplierModel.find({ tenantId: req.user?.tenantId });
  res.json(suppliers);
});

router.post('/supplier', async (req: AuthRequest, res) => {
  const { name, phone, email, address } = req.body;
  const tenantId = req.user!.tenantId;

  const supplier = await SupplierModel.create({
    id: nanoid(),
    name,
    phone,
    email,
    address,
    tenantId,
    createdAt: new Date().toISOString()
  });

  res.json(supplier);
});

router.delete('/supplier/:id', async (req: AuthRequest, res) => {
  await SupplierModel.deleteOne({ id: req.params.id, tenantId: req.user?.tenantId });
  res.json({ message: 'Supplier deleted' });
});

// --- Purchase Bills ---

router.get('/bills', async (req: AuthRequest, res) => {
  const bills = await PurchaseBillModel.find({ tenantId: req.user?.tenantId }).sort({ billDate: -1 });
  res.json(bills);
});

router.get('/bill/:id', async (req: AuthRequest, res) => {
  const bill = await PurchaseBillModel.findOne({ id: req.params.id, tenantId: req.user?.tenantId });
  if (!bill) return res.status(404).json({ message: 'Bill not found' });
  res.json(bill);
});

router.post('/bill/create', async (req: AuthRequest, res) => {
  const { supplierId, items, paymentStatus, notes } = req.body;
  const tenantId = req.user!.tenantId;

  const supplier = await SupplierModel.findOne({ id: supplierId, tenantId });
  if (!supplier && supplierId) return res.status(400).json({ message: 'Invalid supplier' });

  // 1. Calculate Total & Increase Stock
  let totalAmount = 0;
  const processedItems = [];

  for (const item of items) {
    const product = await ProductModel.findOne({ id: item.productId, tenantId });
    if (product) {
      product.stock += item.quantity;
      await product.save();
      totalAmount += item.purchasePrice * item.quantity;
      processedItems.push({
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        purchasePrice: item.purchasePrice
      });
    }
  }

  // 2. Generate Bill Number
  const count = await PurchaseBillModel.countDocuments({ tenantId });
  const billNumber = `PB-${(count + 1).toString().padStart(3, '0')}`;

  const newBill = await PurchaseBillModel.create({
    id: nanoid(),
    billNumber,
    supplierId: supplierId || '',
    supplierName: supplier?.name || 'Walk-in Supplier',
    items: processedItems,
    totalAmount,
    paymentStatus: paymentStatus || 'unpaid',
    billDate: new Date().toISOString(),
    notes: notes || '',
    tenantId
  });

  // Auto-record payment if paid
  if (newBill.paymentStatus === 'paid') {
    await PaymentModel.create({
      id: nanoid(),
      billId: newBill.id,
      billType: 'purchase',
      amount: newBill.totalAmount,
      paymentMode: 'cash',
      paymentDate: new Date().toISOString(),
      note: 'Auto-recorded purchase payment',
      tenantId
    });
    await CashBookModel.create({
      id: nanoid(),
      date: new Date().toISOString(),
      type: 'out',
      amount: newBill.totalAmount,
      note: `Purchase: ${newBill.billNumber}`,
      referenceType: 'purchase',
      referenceId: newBill.id,
      tenantId
    });
  }

  res.json(newBill);
});

// --- Expenses ---

router.get('/expenses', async (req: AuthRequest, res) => {
  const { category, month, year } = req.query;
  const tenantId = req.user!.tenantId;

  const query: any = { tenantId };
  if (category) query.category = category;
  if (month && year) {
    const startDate = new Date(parseInt(year as string), parseInt(month as string) - 1, 1).toISOString();
    const endDate = new Date(parseInt(year as string), parseInt(month as string), 0, 23, 59, 59).toISOString();
    query.date = { $gte: startDate, $lte: endDate };
  }

  const expenses = await ExpenseModel.find(query).sort({ date: -1 });
  res.json(expenses);
});

router.post('/expense', async (req: AuthRequest, res) => {
  const { title, amount, category, note, date } = req.body;
  const tenantId = req.user!.tenantId;

  const newExpense = await ExpenseModel.create({
    id: nanoid(),
    title,
    amount,
    category,
    note: note || '',
    date: date || new Date().toISOString(),
    tenantId
  });

  // Auto-record cash out for expense
  await CashBookModel.create({
    id: nanoid(),
    date: new Date().toISOString(),
    type: 'out',
    amount: newExpense.amount,
    note: `Expense: ${newExpense.title}`,
    referenceType: 'expense',
    referenceId: newExpense.id,
    tenantId
  });

  res.json(newExpense);
});

router.get('/expenses/summary', async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const expenses = await ExpenseModel.find({ tenantId });

  const categories = ['Rent', 'Salary', 'Transport', 'Utilities', 'Marketing', 'Other'];
  const summary = categories.map(cat => ({
    category: cat,
    total: expenses.filter(e => e.category === cat).reduce((acc, e) => acc + e.amount, 0)
  }));

  const grandTotal = summary.reduce((acc, s) => acc + s.total, 0);

  res.json({
    summary,
    grandTotal
  });
});

export default router;
