import express from 'express';
import { 
  CashBookModel, 
  BankAccountModel, 
  BankTransactionModel, 
  PaymentModel, 
  BillModel, 
  PurchaseBillModel, 
  CustomerModel, 
  ExpenseModel 
} from '../db.js';
import { AuthRequest } from '../middleware/auth.js';
import { nanoid } from 'nanoid';

const router = express.Router();

// 1. Cash Book
router.post('/cash', async (req: AuthRequest, res) => {
  const { type, amount, note, referenceType, referenceId } = req.body;
  const entry = await CashBookModel.create({
    id: nanoid(),
    date: new Date().toISOString(),
    type,
    amount,
    note,
    referenceType,
    referenceId,
    tenantId: req.user!.tenantId
  });
  res.json(entry);
});

router.get('/cash-book', async (req: AuthRequest, res) => {
  const entries = await CashBookModel.find({ tenantId: req.user!.tenantId });
  res.json(entries);
});

router.get('/cash-balance', async (req: AuthRequest, res) => {
  const entries = await CashBookModel.find({ tenantId: req.user!.tenantId });
  const balance = entries.reduce((acc, e) => acc + (e.type === 'in' ? e.amount : -e.amount), 0);
  res.json({ balance });
});

// 2. Bank Accounts
router.post('/bank', async (req: AuthRequest, res) => {
  const newAccount = await BankAccountModel.create({
    ...req.body,
    id: nanoid(),
    tenantId: req.user!.tenantId
  });
  res.json(newAccount);
});

router.get('/banks', async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const accounts = await BankAccountModel.find({ tenantId });
  
  const accountsWithBalance = [];
  for (const acc of accounts) {
    const txns = await BankTransactionModel.find({ bankAccountId: acc.id, tenantId });
    const balance = acc.openingBalance + txns.reduce((sum, t) => sum + (t.type === 'credit' ? t.amount : -t.amount), 0);
    accountsWithBalance.push({ ...acc.toObject(), balance });
  }
  
  res.json(accountsWithBalance);
});

router.post('/bank-transaction', async (req: AuthRequest, res) => {
  const txn = await BankTransactionModel.create({
    ...req.body,
    id: nanoid(),
    date: new Date().toISOString(),
    tenantId: req.user!.tenantId
  });
  res.json(txn);
});

router.get('/bank/:id/statement', async (req: AuthRequest, res) => {
  const txns = await BankTransactionModel.find({ bankAccountId: req.params.id, tenantId: req.user!.tenantId });
  res.json(txns);
});

// 3. Payments logic
router.post('/payment', async (req: AuthRequest, res) => {
  const { billId, billType, amount, paymentMode, note } = req.body;
  const tenantId = req.user!.tenantId;

  const payment = await PaymentModel.create({
    id: nanoid(),
    billId,
    billType,
    amount,
    paymentMode,
    paymentDate: new Date().toISOString(),
    note,
    tenantId
  });

  // Update Bill Status
  if (billType === 'sale') {
    const bill = await BillModel.findOne({ id: billId, tenantId });
    if (bill) {
      const allPayments = await PaymentModel.find({ billId, billType: 'sale', tenantId });
      const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
      if (totalPaid >= bill.totalAmount) {
        bill.paymentStatus = 'paid';
        await bill.save();
      }
    }
  } else {
    const bill = await PurchaseBillModel.findOne({ id: billId, tenantId });
    if (bill) {
      const allPayments = await PaymentModel.find({ billId, billType: 'purchase', tenantId });
      const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
      if (totalPaid >= bill.totalAmount) {
        bill.paymentStatus = 'paid';
        await bill.save();
      }
    }
  }

  // Create Cash/Bank Entries
  if (paymentMode === 'cash') {
    await CashBookModel.create({
      id: nanoid(),
      date: new Date().toISOString(),
      type: billType === 'sale' ? 'in' : 'out',
      amount,
      note: `Payment for ${billType} bill`,
      referenceType: billType,
      referenceId: billId,
      tenantId
    });
  } else if (['upi', 'card', 'bank_transfer'].includes(paymentMode)) {
    const bankAccount = await BankAccountModel.findOne({ tenantId });
    if (bankAccount) {
      await BankTransactionModel.create({
        id: nanoid(),
        bankAccountId: bankAccount.id,
        date: new Date().toISOString(),
        type: billType === 'sale' ? 'credit' : 'debit',
        amount,
        note: `Payment for ${billType} bill`,
        referenceType: billType,
        referenceId: billId,
        tenantId
      });
    }
  }

  res.json(payment);
});

router.get('/receivables', async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const bills = await BillModel.find({ tenantId, documentType: 'invoice', paymentStatus: { $ne: 'paid' } });
  
  const receivables = [];
  for (const bill of bills) {
    const allPayments = await PaymentModel.find({ billId: bill.id, billType: 'sale', tenantId });
    const paid = allPayments.reduce((sum, p) => sum + p.amount, 0);
    const customer = await CustomerModel.findOne({ id: bill.customerId, tenantId });
    const balance = bill.totalAmount - paid;
    if (balance > 0) {
      receivables.push({
        bill,
        customerName: customer?.name || 'Walk-in',
        paid,
        balance
      });
    }
  }

  res.json(receivables);
});

router.get('/payables', async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const bills = await PurchaseBillModel.find({ tenantId, paymentStatus: 'unpaid' });
  
  const payables = [];
  for (const bill of bills) {
    const allPayments = await PaymentModel.find({ billId: bill.id, billType: 'purchase', tenantId });
    const paid = allPayments.reduce((sum, p) => sum + p.amount, 0);
    const balance = bill.totalAmount - paid;
    if (balance > 0) {
      payables.push({
        bill,
        supplierName: bill.supplierName,
        paid,
        balance
      });
    }
  }

  res.json(payables);
});

router.get('/profit-loss', async (req: AuthRequest, res) => {
  const { from, to } = req.query;
  const tenantId = req.user!.tenantId;

  const fromDate = from ? new Date(from as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const toDate = to ? new Date(to as string) : new Date();

  const sales = await BillModel.find({ 
    tenantId, 
    documentType: 'invoice', 
    createdAt: { $gte: fromDate.toISOString(), $lte: toDate.toISOString() },
    paymentStatus: 'paid'
  });

  const revenue = sales.reduce((acc, b) => acc + b.subTotal, 0);

  const purchases = await PurchaseBillModel.find({ 
    tenantId, 
    billDate: { $gte: fromDate.toISOString(), $lte: toDate.toISOString() }
  });

  const costOfGoods = purchases.reduce((acc, b) => acc + b.totalAmount, 0);
  const grossProfit = revenue - costOfGoods;

  const expenses = await ExpenseModel.find({ 
    tenantId, 
    date: { $gte: fromDate.toISOString(), $lte: toDate.toISOString() }
  });

  const operatingExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const netProfit = grossProfit - operatingExpenses;
  const profitMargin = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) + '%' : '0%';

  res.json({
    period: { from: fromDate.toISOString(), to: toDate.toISOString() },
    revenue,
    costOfGoods,
    grossProfit,
    operatingExpenses,
    netProfit,
    profitMargin
  });
});

export default router;
