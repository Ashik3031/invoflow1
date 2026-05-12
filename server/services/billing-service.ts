import express from 'express';
import { 
  BillModel, 
  ProductModel, 
  CustomerModel, 
  LoyaltyConfigModel, 
  PaymentModel, 
  CashBookModel, 
  BankAccountModel, 
  BankTransactionModel, 
  TenantModel 
} from '../db.js';
import { nanoid } from 'nanoid';
import { AuthRequest } from '../middleware/auth.js';

const router = express.Router();

router.get('/list', async (req: AuthRequest, res) => {
  const bills = await BillModel.find({ tenantId: req.user?.tenantId }).sort({ createdAt: -1 });
  res.json(bills);
});

function calculateGST(items: any[], isInterState: boolean) {
  let subTotal = 0;
  let totalGst = 0;
  const processedItems = items.map(item => {
    const baseAmount = item.price * item.quantity;
    const gstAmount = baseAmount * ((item.gstRate || 0) / 100);
    const lineTotal = baseAmount + gstAmount;

    subTotal += baseAmount;
    totalGst += gstAmount;

    return {
      ...item,
      gstAmount,
      lineTotal
    };
  });

  let cgst = 0, sgst = 0, igst = 0;
  if (isInterState) {
    igst = totalGst;
  } else {
    cgst = totalGst / 2;
    sgst = totalGst / 2;
  }

  return {
    processedItems,
    subTotal,
    totalGst,
    cgst,
    sgst,
    igst,
    totalAmount: subTotal + totalGst
  };
}

router.post('/create', async (req: AuthRequest, res) => {
  const { 
    customerName = 'Walk-in', 
    customerPhone, 
    items: rawItems, 
    payments: inputPayments = [], 
    discountAmount = 0, 
    pointsRedeemed = 0,
    documentType = 'invoice',
    customerGstin,
    customerState,
    linkedBillId
  } = req.body;

  const tenantId = req.user!.tenantId;
  const tenant = await TenantModel.findOne({ id: tenantId });

  // 1. Detect Inter-State
  const isInterState = customerState && tenant?.state && customerState !== tenant.state;

  // 2. Fetch Product Info & Validate
  const items = [];
  for (const item of rawItems) {
    const product = await ProductModel.findOne({ id: item.productId, tenantId });
    if (!product) continue;

    if (['invoice', 'credit_note'].includes(documentType)) {
      if (documentType === 'invoice') {
        if (product.stock < item.quantity) {
          return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
        }
        product.stock -= item.quantity;
      } else if (documentType === 'credit_note') {
        product.stock += item.quantity;
      }
      await product.save();
    }

    items.push({
      productId: product.id,
      productName: product.name,
      quantity: item.quantity,
      price: product.price,
      hsnCode: product.hsnCode,
      gstRate: product.gstRate
    });
  }

  // 3. GST Calculation
  const gstResult = calculateGST(items, !!isInterState);
  const loyaltyConfig = await LoyaltyConfigModel.findOne({ tenantId });
  const finalAmount = Math.max(0, gstResult.totalAmount - discountAmount - (pointsRedeemed * (loyaltyConfig?.valuePerPoint || 0)));

  // 4. Payment Logic
  const paymentsWithDate = inputPayments.map((p: any) => ({
    ...p,
    paidAt: p.paidAt || new Date().toISOString()
  }));
  const totalPaid = paymentsWithDate.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  let computedStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
  if (totalPaid >= finalAmount) computedStatus = 'paid';
  else if (totalPaid > 0) computedStatus = 'partial';

  // 5. Handle Customer
  let customerId = undefined;
  let customer = null;
  if (customerPhone) {
    customer = await CustomerModel.findOne({ phone: customerPhone, tenantId });
    if (!customer) {
      customer = await CustomerModel.create({ 
        id: nanoid(), 
        name: customerName, 
        phone: customerPhone, 
        tenantId,
        notes: '',
        totalSpent: 0,
        totalOrders: 0,
        loyaltyPoints: 0
      });
    }
    customerId = customer.id;
  }

  // 6. Loyalty Logic
  if (customer && documentType === 'invoice') {
    if (loyaltyConfig?.enabled) {
      if (pointsRedeemed > 0) {
        customer.loyaltyPoints = Math.max(0, (customer.loyaltyPoints || 0) - pointsRedeemed);
      }
      const earned = Math.floor(finalAmount * loyaltyConfig.pointsPerRupee);
      customer.loyaltyPoints = (customer.loyaltyPoints || 0) + earned;
    }
    customer.totalSpent = (customer.totalSpent || 0) + finalAmount;
    customer.totalOrders = (customer.totalOrders || 0) + 1;
    customer.lastPurchaseDate = new Date().toISOString();
    await customer.save();
  }

  // 7. Create Bill
  const prefix = documentType === 'invoice' ? 'INV' : 
                 documentType === 'estimate' ? 'EST' : 
                 documentType === 'credit_note' ? 'CRN' : 'CHA';
  
  const billCount = await BillModel.countDocuments({ tenantId, documentType });
  const billNumber = `${prefix}-${new Date().getFullYear()}-${(billCount + 1).toString().padStart(4, '0')}`;

  const newBill = await BillModel.create({
    id: nanoid(),
    billNumber,
    customerId,
    items: gstResult.processedItems,
    totalAmount: finalAmount,
    discountAmount,
    pointsRedeemed,
    paymentStatus: computedStatus,
    payments: paymentsWithDate,
    tenantId,
    createdAt: new Date().toISOString(),
    documentType,
    customerGstin,
    customerState,
    isInterState: !!isInterState,
    gstBreakdown: {
      cgst: gstResult.cgst,
      sgst: gstResult.sgst,
      igst: gstResult.igst,
      totalGst: gstResult.totalGst
    },
    subTotal: gstResult.subTotal,
    linkedBillId,
  });

  // 8. Log Accounting Records
  if (documentType === 'invoice') {
    for (const p of paymentsWithDate) {
      await PaymentModel.create({
        id: nanoid(),
        billId: newBill.id,
        billType: 'sale',
        amount: p.amount,
        paymentMode: p.mode,
        paymentDate: p.paidAt,
        note: `Sold: ${newBill.billNumber}`,
        tenantId
      });

      if (p.mode === 'cash') {
        await CashBookModel.create({
          id: nanoid(),
          date: p.paidAt,
          type: 'in',
          amount: p.amount,
          note: `Cash sale: ${newBill.billNumber}`,
          referenceType: 'sale',
          referenceId: newBill.id,
          tenantId
        });
      } else if (['bank_transfer', 'upi', 'card'].includes(p.mode)) {
        const bank = await BankAccountModel.findOne({ tenantId });
        if (bank) {
          await BankTransactionModel.create({
            id: nanoid(),
            bankAccountId: bank.id,
            date: p.paidAt,
            type: 'credit',
            amount: p.amount,
            note: `${p.mode.toUpperCase()} sale: ${newBill.billNumber}`,
            referenceType: 'sale',
            referenceId: newBill.id,
            tenantId
          });
        }
      }
    }
  }

  res.json(newBill);
});

router.post('/estimate/:id/convert', async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const estimate = await BillModel.findOne({ id: req.params.id, tenantId, documentType: 'estimate' });
  
  if (!estimate) return res.status(404).json({ message: 'Estimate not found' });
  if (estimate.convertedToInvoice) return res.status(400).json({ message: 'Already converted' });

  // Stock check & update
  for (const item of estimate.items) {
    const product = await ProductModel.findOne({ id: item.productId, tenantId });
    if (product) {
      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
      }
      product.stock -= item.quantity;
      await product.save();
    }
  }

  const invoiceCount = await BillModel.countDocuments({ tenantId, documentType: 'invoice' });
  const invoiceNumber = `INV-${new Date().getFullYear()}-${(invoiceCount + 1).toString().padStart(4, '0')}`;

  const invoiceData = estimate.toObject();
  delete (invoiceData as any)._id;
  
  const newInvoice = await BillModel.create({
    ...invoiceData,
    id: nanoid(),
    billNumber: invoiceNumber,
    documentType: 'invoice',
    createdAt: new Date().toISOString(),
    convertedToInvoice: undefined
  });

  estimate.convertedToInvoice = true;
  await estimate.save();

  res.json(newInvoice);
});

router.get('/gst-summary', async (req: AuthRequest, res) => {
  const { month, year } = req.query;
  const tenantId = req.user!.tenantId;
  
  const query: any = { tenantId, documentType: 'invoice' };

  if (month && year) {
    const startDate = new Date(parseInt(year as string), parseInt(month as string) - 1, 1).toISOString();
    const endDate = new Date(parseInt(year as string), parseInt(month as string), 0, 23, 59, 59).toISOString();
    query.createdAt = { $gte: startDate, $lte: endDate };
  }

  const bills = await BillModel.find(query);

  const totalSales = bills.reduce((acc, b) => acc + b.subTotal, 0);
  const totalGst = bills.reduce((acc, b) => acc + (b.gstBreakdown?.totalGst || 0), 0);
  const cgst = bills.reduce((acc, b) => acc + (b.gstBreakdown?.cgst || 0), 0);
  const sgst = bills.reduce((acc, b) => acc + (b.gstBreakdown?.sgst || 0), 0);
  const igst = bills.reduce((acc, b) => acc + (b.gstBreakdown?.igst || 0), 0);

  res.json({
    month: month && year ? `${month}/${year}` : 'All Time',
    totalSales,
    totalGst,
    cgst,
    sgst,
    igst,
    billCount: bills.length
  });
});

router.get('/dashboard', async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const bills = await BillModel.find({ tenantId });
  const todayBills = bills.filter(b => {
    const d = new Date(b.createdAt);
    return d >= todayStart && d <= todayEnd;
  });
  
  const totalSales = todayBills.reduce((acc, b) => acc + b.totalAmount, 0);
  const pendingPayments = await BillModel.countDocuments({ tenantId, paymentStatus: 'unpaid' });
  const lowStockItems = await ProductModel.countDocuments({ tenantId, stock: { $lt: 10 } });

  const bestCustomers = await CustomerModel.find({ tenantId }).sort({ totalSpent: -1 }).limit(5);

  const productPerformance = new Map<string, { name: string, quantity: number, revenue: number }>();
  for (const b of bills) {
    for (const item of b.items) {
      const current = productPerformance.get(item.productId) || { name: item.productName, quantity: 0, revenue: 0 };
      current.quantity += item.quantity;
      current.revenue += item.quantity * item.price;
      productPerformance.set(item.productId, current);
    }
  }

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
