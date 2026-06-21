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
  TenantModel,
  ExpenseModel,
  ReturnLogModel
} from '../db.js';
import { nanoid } from 'nanoid';
import { AuthRequest } from '../middleware/auth.js';
import { createNotification } from './notification-service.js';

const router = express.Router();

router.get('/list', async (req: AuthRequest, res) => {
  const bills = await BillModel.find({ tenantId: req.user?.tenantId }).sort({ createdAt: -1 });
  
  // Create a map for quick customer lookup if needed
  const customerIds = [...new Set(bills.map(b => b.customerId).filter(Boolean))];
  const customers = await CustomerModel.find({ id: { $in: customerIds }, tenantId: req.user?.tenantId });
  const customerMap = new Map(customers.map(c => [c.id, c]));

  const enrichedBills = bills.map(bill => {
    const b = bill.toObject();
    if (!b.customerName || b.customerName === 'Walk-in') {
      const customer = customerMap.get(b.customerId!);
      if (customer) {
        b.customerName = customer.name;
        if (!b.customerPhone) b.customerPhone = customer.phone;
      }
    }
    return b;
  });

  res.json(enrichedBills);
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

    if (['invoice', 'credit_note', 'challan'].includes(documentType)) {
      if (['invoice', 'challan'].includes(documentType)) {
        if (product.stock < item.quantity) {
          return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
        }
        product.stock -= item.quantity;
      } else if (documentType === 'credit_note') {
        product.stock += item.quantity;
      }
      await product.save();

      if (['invoice', 'challan'].includes(documentType) && product.stock <= 5) {
        await createNotification(
          tenantId,
          'Low Stock Alert',
          `Product "${product.name}" is low on stock (${product.stock} units remaining).`,
          'low_stock'
        );
      }
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
  const { storeCreditApplied = 0 } = req.body;
  
  let finalAmount = Math.max(0, gstResult.totalAmount - discountAmount - (pointsRedeemed * (loyaltyConfig?.valuePerPoint || 0)));

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

  // 6. Loyalty and Store Credit Logic
  if (customer && documentType === 'invoice') {
    if (storeCreditApplied > 0) {
      const actualCreditApplied = Math.min((customer.storeCredit || 0), (gstResult.totalAmount - discountAmount - (pointsRedeemed * (loyaltyConfig?.valuePerPoint || 0))), storeCreditApplied);
      finalAmount = Math.max(0, finalAmount - actualCreditApplied);
      customer.storeCredit = Math.max(0, (customer.storeCredit || 0) - actualCreditApplied);
    }
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
    customerName: customer?.name || customerName || 'Walk-in',
    customerPhone: customer?.phone || customerPhone,
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

  const docLabel = documentType === 'invoice' ? 'Invoice' :
                   documentType === 'estimate' ? 'Estimate' :
                   documentType === 'credit_note' ? 'Credit Note' : 'Delivery Challan';
  await createNotification(
    tenantId,
    `${docLabel} Generated`,
    `${docLabel} #${newBill.billNumber} created for ${newBill.customerName} - Total: ₹${newBill.totalAmount}`,
    documentType === 'invoice' ? 'sale' : 'general'
  );

  res.json(newBill);
});

router.post('/convert/:type/:id', async (req: AuthRequest, res) => {
  try {
    const { type, id } = req.params;
    const { tenantId } = req.user!;
    console.log(`Starting conversion: type=${type}, id=${id}, tenantId=${tenantId}`);
    
    const sourceDoc = await BillModel.findOne({ id, tenantId, documentType: type as any });
    
    if (!sourceDoc) {
      console.warn(`Source document not found: type=${type}, id=${id}`);
      return res.status(404).json({ message: `${type} not found` });
    }
    if (sourceDoc.convertedToInvoice) return res.status(400).json({ message: 'Already converted' });

    // 1. Stock check & update only if not already deducted
    if (type === 'estimate') {
      for (const item of sourceDoc.items) {
        const product = await ProductModel.findOne({ id: item.productId, tenantId });
        if (product) {
          if (product.stock < item.quantity) {
            return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
          }
          product.stock -= item.quantity;
          await product.save();
        }
      }
    }

    // 2. Generate Invoice Number
    const invoiceCount = await BillModel.countDocuments({ tenantId, documentType: 'invoice' });
    const invoiceNumber = `INV-${new Date().getFullYear()}-${(invoiceCount + 1).toString().padStart(4, '0')}`;

    // 3. Prepare Invoice Data
    const invoiceData = (sourceDoc as any).toObject();
    delete invoiceData._id;
    delete invoiceData.id;
    
    const paymentDate = new Date().toISOString();
    const paymentMode = 'cash';

    const newInvoice = await BillModel.create({
      ...invoiceData,
      id: nanoid(),
      billNumber: invoiceNumber,
      documentType: 'invoice',
      createdAt: paymentDate,
      paymentStatus: 'paid',
      payments: [{
        mode: paymentMode,
        amount: sourceDoc.totalAmount,
        paidAt: paymentDate
      }],
      convertedToInvoice: undefined
    });

    // 4. Update Customer Stats
    if (sourceDoc.customerId) {
      const customer = await CustomerModel.findOne({ id: sourceDoc.customerId, tenantId });
      if (customer) {
        customer.totalSpent = (customer.totalSpent || 0) + sourceDoc.totalAmount;
        customer.totalOrders = (customer.totalOrders || 0) + 1;
        customer.lastPurchaseDate = paymentDate;
        await customer.save();
      }
    }

    // 5. Log Accounting Records
    await PaymentModel.create({
      id: nanoid(),
      billId: newInvoice.id,
      billType: 'sale',
      amount: sourceDoc.totalAmount,
      paymentMode: paymentMode,
      paymentDate: paymentDate,
      note: `Converted from ${type}: ${sourceDoc.billNumber}`,
      tenantId
    });

    if (paymentMode === 'cash') {
      await CashBookModel.create({
        id: nanoid(),
        date: paymentDate,
        type: 'in',
        amount: sourceDoc.totalAmount,
        note: `Cash sale (Converted from ${type}): ${newInvoice.billNumber}`,
        referenceType: 'sale',
        referenceId: newInvoice.id,
        tenantId
      });
    }

    // 6. Finalize Source Document
    sourceDoc.convertedToInvoice = true;
    await (sourceDoc as any).save();

    res.json(newInvoice);
  } catch (err: any) {
    console.error('Conversion error:', err);
    res.status(500).json({ message: 'Internal server error during conversion', error: err.message });
  }
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

  // Parse performanceRange filter
  const performanceRange = (req.query.performanceRange as string) || 'this_month';
  let perfStart: Date | null = null;
  let perfEnd: Date | null = null;
  const now = new Date();

  if (performanceRange === 'this_month') {
    perfStart = new Date(now.getFullYear(), now.getMonth(), 1);
    perfEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (performanceRange === 'last_month') {
    perfStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    perfEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  } else if (performanceRange === 'this_week') {
    perfStart = new Date();
    perfStart.setHours(0, 0, 0, 0);
    perfStart.setDate(perfStart.getDate() - 6);
    perfEnd = new Date();
    perfEnd.setHours(23, 59, 59, 999);
  } else if (performanceRange === 'all_time') {
    perfStart = null;
    perfEnd = null;
  }

  const perfBills = bills.filter(b => {
    if (!perfStart || !perfEnd) return true;
    const d = new Date(b.createdAt);
    return d >= perfStart && d <= perfEnd;
  });

  const productPerformance = new Map<string, { name: string, quantity: number, revenue: number }>();
  for (const b of perfBills) {
    for (const item of b.items) {
      const current = productPerformance.get(item.productId) || { name: item.productName, quantity: 0, revenue: 0 };
      current.quantity += item.quantity;
      current.revenue += item.quantity * item.price;
      productPerformance.set(item.productId, current);
    }
  }

  // Enrich topProducts with actual stock and category
  const productIds = Array.from(productPerformance.keys());
  const products = await ProductModel.find({ id: { $in: productIds }, tenantId });
  const productMap = new Map(products.map(p => [p.id, p]));

  const topProducts = Array.from(productPerformance.entries())
    .map(([id, perf]) => {
      const dbProd = productMap.get(id);
      return {
        id,
        name: perf.name,
        quantitySold: perf.quantity,
        revenue: perf.revenue,
        stock: dbProd ? dbProd.stock : 15, // fallback if product deleted
        category: dbProd ? dbProd.category : 'Retail'
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Compute other real statistics
  let todayUnitsSold = 0;
  for (const b of todayBills) {
    for (const item of b.items) {
      todayUnitsSold += item.quantity;
    }
  }

  const totalInventoryCount = await ProductModel.countDocuments({ tenantId });
  const totalCustomersCount = await CustomerModel.countDocuments({ tenantId });

  // Calculate dynamic weekly/daily/monthly/yearly chart data
  const revenueView = (req.query.revenueView as string) || 'day';
  const chartData = [];

  if (revenueView === 'day') {
    let sDate = new Date();
    sDate.setDate(sDate.getDate() - 6); // default 7 days 
    let eDate = new Date();

    if (req.query.startDate) {
      sDate = new Date(req.query.startDate as string);
    }
    if (req.query.endDate) {
      eDate = new Date(req.query.endDate as string);
    }

    sDate.setHours(0, 0, 0, 0);
    eDate.setHours(23, 59, 59, 999);

    const diffMs = eDate.getTime() - sDate.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const daysToGenerate = Math.min(Math.max(diffDays, 1), 60); // limit to 60 days

    for (let i = daysToGenerate - 1; i >= 0; i--) {
      const dayDate = new Date(eDate);
      dayDate.setDate(dayDate.getDate() - i);
      
      const dayStart = new Date(dayDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayDate);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dStr = dayDate.toISOString().split('T')[0];
      const dayLabel = dayDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
      
      const dayBills = bills.filter(b => {
        const d = new Date(b.createdAt);
        return d >= dayStart && d <= dayEnd;
      });
      
      const daySales = dayBills.reduce((acc, b) => acc + b.totalAmount, 0);
      
      const dayExpensesDocs = await ExpenseModel.find({ tenantId, date: dStr });
      const dayExpenses = dayExpensesDocs.reduce((acc, e) => acc + e.amount, 0);
      
      chartData.push({
        name: dayLabel,
        value: daySales,
        expense: dayExpenses
      });
    }
  } else if (revenueView === 'month') {
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date();
      monthDate.setMonth(monthDate.getMonth() - i);
      
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);
      
      const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      
      const monthBills = bills.filter(b => {
        const d = new Date(b.createdAt);
        return d >= monthStart && d <= monthEnd;
      });
      const monthSales = monthBills.reduce((acc, b) => acc + b.totalAmount, 0);
      
      const yyyyMm = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      const monthExpensesDocs = await ExpenseModel.find({ 
        tenantId, 
        date: { $regex: new RegExp(`^${yyyyMm}`) } 
      });
      const monthExpenses = monthExpensesDocs.reduce((acc, e) => acc + e.amount, 0);
      
      chartData.push({
        name: monthLabel,
        value: monthSales,
        expense: monthExpenses
      });
    }
  } else if (revenueView === 'year') {
    const currentYear = new Date().getFullYear();
    for (let i = 2; i >= 0; i--) {
      const year = currentYear - i;
      
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);
      
      const yearLabel = `${year}`;
      
      const yearBills = bills.filter(b => {
        const d = new Date(b.createdAt);
        return d >= yearStart && d <= yearEnd;
      });
      const yearSales = yearBills.reduce((acc, b) => acc + b.totalAmount, 0);
      
      const yearExpensesDocs = await ExpenseModel.find({ 
        tenantId, 
        date: { $regex: new RegExp(`^${year}`) } 
      });
      const yearExpenses = yearExpensesDocs.reduce((acc, e) => acc + e.amount, 0);
      
      chartData.push({
        name: yearLabel,
        value: yearSales,
        expense: yearExpenses
      });
    }
  }

  res.json({
    todaySales: totalSales,
    todayBillCount: todayBills.length,
    pendingPayments,
    lowStockItems,
    bestCustomers,
    topProducts,
    todayUnitsSold,
    totalInventoryCount,
    totalCustomersCount,
    chartData
  });
});

// --- SALES RETURN & EXCHANGE ENDPOINTS ---

const generateCreditNoteNumber = async (tenantId: string) => {
  const count = await BillModel.countDocuments({
    tenantId,
    documentType: 'credit_note'
  });
  return `CN-${String(count + 1).padStart(3, '0')}`;
};

// Create a sales return, partial return or exchange (main POST endpoint)
router.post('/returns/create', async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const { 
      originalBillId, 
      returnType, 
      returnReason, 
      returnReasonNote = '', 
      returnItems = [], 
      exchangeItems = [], 
      refundMode, 
      refundNote = '' 
    } = req.body;

    if (!originalBillId) {
      return res.status(400).json({ message: "Original invoice ID is required." });
    }

    if (!['full_return', 'partial_return', 'exchange'].includes(returnType)) {
      return res.status(400).json({ message: "Invalid or missing returnType." });
    }

    // 1 & 2. Find and verify invoice & tenant
    const originalBill = await BillModel.findOne({ id: originalBillId });
    if (!originalBill) {
      return res.status(404).json({ message: `Invoice INV-045 not found` }); // Matching standard prompt error pattern
    }
    if (originalBill.tenantId !== tenantId) {
      return res.status(403).json({ message: "Access denied" });
    }

    // 3. Verify bill is an completed invoice
    if (originalBill.documentType !== 'invoice') {
      return res.status(400).json({ message: `Only completed invoices can be returned. ${originalBill.billNumber} is an ${originalBill.documentType}.` });
    }

    // 4. Check for existing return on this bill
    const existingReturn = await BillModel.findOne({ 
      tenantId, 
      linkedBillId: originalBill.id, 
      documentType: 'credit_note' 
    });
    if (existingReturn) {
      return res.status(400).json({ message: `A return (${existingReturn.billNumber}) has already been processed for ${originalBill.billNumber}. Cannot process duplicate return.` });
    }

    // Prepare return items
    let returnItemsToProcess = [];
    if (returnType === 'full_return') {
      returnItemsToProcess = originalBill.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity
      }));
    } else {
      returnItemsToProcess = returnItems;
    }

    if (!returnItemsToProcess || returnItemsToProcess.length === 0) {
      return res.status(400).json({ message: "No return items selected." });
    }

    // 5 & 6 & 8. Validate return items
    for (const item of returnItemsToProcess) {
      const originalItem = originalBill.items.find(i => i.productId === item.productId);
      if (!originalItem) {
        return res.status(400).json({ message: `Product '${item.productId}' was not part of Invoice ${originalBill.billNumber}.` });
      }
      if (item.quantity <= 0) {
        return res.status(400).json({ message: "Return quantity must be at least 1." });
      }
      if (item.quantity > originalItem.quantity) {
        return res.status(400).json({ message: `Cannot return ${item.quantity} units of ${originalItem.productName} — only ${originalItem.quantity} units were purchased.` });
      }
    }

    // 7. Validate exchange items stock (if exchange)
    const exchangeItemsToProcess = exchangeItems || [];
    if (returnType === 'exchange') {
      for (const item of exchangeItemsToProcess) {
        const prod = await ProductModel.findOne({ id: item.productId, tenantId });
        if (!prod) {
          return res.status(400).json({ message: `Exchange product with ID ${item.productId} not found.` });
        }
        if (prod.stock < item.quantity) {
          return res.status(400).json({ message: `Cannot exchange — ${prod.name} has only ${prod.stock} units in stock, but ${item.quantity} requested.` });
        }
      }
    }

    // 9 & 11. Validate refund mode & customer
    const customerId = originalBill.customerId;
    if (returnType !== 'exchange' || returnItemsToProcess.length > 0) {
      if (!refundMode) {
        return res.status(400).json({ message: "Please select a refund method (cash, UPI, or store credit)." });
      }
      if (refundMode === 'store_credit' && (!customerId || customerId === 'walk-in' || originalBill.customerName === 'Walk-in')) {
        return res.status(400).json({ message: "Store credit requires a customer profile. Please add customer details first." });
      }
    }

    // Process Return Stock & Math
    const itemsReturnedForCreditNote: any[] = [];
    let returnedSubTotal = 0;
    let returnedGstTotal = 0;

    for (const returnItem of returnItemsToProcess) {
      const origItem = originalBill.items.find(i => i.productId === returnItem.productId)!;
      const qty = returnItem.quantity;
      const baseAmount = origItem.price * qty;
      const gstAmount = baseAmount * ((origItem.gstRate || 0) / 100);
      const lineTotal = baseAmount + gstAmount;

      returnedSubTotal += baseAmount;
      returnedGstTotal += gstAmount;

      itemsReturnedForCreditNote.push({
        productId: origItem.productId,
        productName: origItem.productName,
        quantity: qty,
        price: origItem.price,
        hsnCode: origItem.hsnCode || '',
        gstRate: origItem.gstRate,
        gstAmount,
        lineTotal
      });

      // Restore Product Stock
      await ProductModel.findOneAndUpdate(
        { id: returnItem.productId, tenantId },
        { $inc: { stock: qty } }
      );
    }

    // Process Exchange stock & math
    const processedExchangeItems: any[] = [];
    let exchangeSubTotal = 0;
    let exchangeGstTotal = 0;

    for (const exItem of exchangeItemsToProcess) {
      const prod = await ProductModel.findOne({ id: exItem.productId, tenantId });
      if (prod) {
        const qty = exItem.quantity;
        const baseAmount = prod.price * qty;
        const gstAmount = baseAmount * ((prod.gstRate || 0) / 100);
        const lineTotal = baseAmount + gstAmount;

        exchangeSubTotal += baseAmount;
        exchangeGstTotal += gstAmount;

        processedExchangeItems.push({
          productId: prod.id,
          productName: prod.name,
          quantity: qty,
          price: prod.price,
          hsnCode: prod.hsnCode || '',
          gstRate: prod.gstRate || 0,
          gstAmount,
          lineTotal
        });

        // Deduct stock of exchange item
        await ProductModel.findOneAndUpdate(
          { id: prod.id, tenantId },
          { $inc: { stock: -qty } }
        );
      }
    }

    const totalReturnAmount = returnedSubTotal + returnedGstTotal;
    const totalExchangeAmount = exchangeSubTotal + exchangeGstTotal;

    let refundAmount = 0;
    let collectAmount = 0;
    let balanceType: 'refund_to_customer' | 'collect_from_customer' | 'even' = 'even';

    if (returnType === 'exchange') {
      const priceDifference = totalReturnAmount - totalExchangeAmount;
      if (priceDifference > 0) {
        refundAmount = priceDifference;
        balanceType = 'refund_to_customer';
      } else if (priceDifference < 0) {
        collectAmount = Math.abs(priceDifference);
        balanceType = 'collect_from_customer';
      } else {
        balanceType = 'even';
      }
    } else {
      refundAmount = totalReturnAmount;
      balanceType = 'refund_to_customer';
    }

    // 10. Handle Unpaid / Partially Paid Warnings & Ajustments
    let warningMsg = '';
    if (['unpaid', 'partial'].includes(originalBill.paymentStatus || '')) {
      const originalPaymentAmount = originalBill.payments?.reduce((acc, p) => acc + p.amount, 0) || 0;
      const originalOutstanding = originalBill.totalAmount - originalPaymentAmount;

      if (originalOutstanding > 0) {
        const actualRefundPossible = Math.max(0, refundAmount - originalOutstanding);
        warningMsg = `Note: Invoice ${originalBill.billNumber} was unpaid. The refund amount has been adjusted and the outstanding balance cancelled.`;
        refundAmount = actualRefundPossible;

        // Cancel outstanding on original invoice
        await BillModel.findOneAndUpdate(
          { id: originalBill.id, tenantId },
          { paymentStatus: 'refunded' }
        );
      }
    }

    // Update Customer store credit or record outer CashBook
    let cashbookRetEntry: any = null;
    const creditNoteNumber = await generateCreditNoteNumber(tenantId);
    const creditNoteId = nanoid();

    if (balanceType === 'refund_to_customer' && refundAmount > 0) {
      if (refundMode === 'store_credit' && customerId) {
        await CustomerModel.findOneAndUpdate(
          { id: customerId, tenantId },
          { $inc: { storeCredit: refundAmount } }
        );
      } else if (refundMode === 'cash') {
        cashbookRetEntry = await CashBookModel.create({
          id: nanoid(),
          date: new Date().toISOString(),
          type: 'out',
          amount: refundAmount,
          note: `Refund for ${creditNoteNumber} (Return of ${originalBill.billNumber})`,
          referenceType: 'sale',
          referenceId: originalBill.id,
          tenantId
        });
      }
    } else if (balanceType === 'collect_from_customer' && collectAmount > 0) {
      cashbookRetEntry = await CashBookModel.create({
        id: nanoid(),
        date: new Date().toISOString(),
        type: 'in',
        amount: collectAmount,
        note: `Collection for ${creditNoteNumber} (Exchange difference of ${originalBill.billNumber})`,
        referenceType: 'sale',
        referenceId: originalBill.id,
        tenantId
      });
    }

    // Calculate GST breakdown for Credit Note
    let cgst = 0, sgst = 0, igst = 0;
    if (originalBill.isInterState) {
      igst = returnedGstTotal;
    } else {
      cgst = returnedGstTotal / 2;
      sgst = returnedGstTotal / 2;
    }

    // Create the Credit Note document
    const newCreditNote = await BillModel.create({
      id: creditNoteId,
      billNumber: creditNoteNumber,
      customerId: originalBill.customerId,
      customerName: originalBill.customerName,
      customerPhone: originalBill.customerPhone,
      items: itemsReturnedForCreditNote,
      totalAmount: returnType === 'exchange' ? totalReturnAmount : refundAmount,
      discountAmount: 0,
      pointsRedeemed: 0,
      paymentStatus: 'refunded',
      payments: refundAmount > 0 ? [{
        mode: refundMode || 'cash',
        amount: refundAmount,
        reference: refundNote || '',
        paidAt: new Date().toISOString()
      }] : [],
      tenantId,
      createdAt: new Date().toISOString(),
      documentType: 'credit_note',
      customerGstin: originalBill.customerGstin,
      customerState: originalBill.customerState,
      isInterState: originalBill.isInterState,
      gstBreakdown: {
        cgst,
        sgst,
        igst,
        totalGst: returnedGstTotal
      },
      subTotal: returnedSubTotal,
      linkedBillId: originalBill.id,

      returnType,
      linkedBillNumber: originalBill.billNumber,
      returnReason: returnReason || 'other',
      returnReasonNote,
      exchangeItems: processedExchangeItems,
      refundAmount,
      collectAmount,
      balanceType,
      refundMode: refundMode || null,
      refundNote,
      processedBy: req.user?.userId || 'admin'
    });

    // Save logs for each returned item
    const stockRestoredList = [];
    for (const item of itemsReturnedForCreditNote) {
      const prod = await ProductModel.findOne({ id: item.productId, tenantId });
      
      await ReturnLogModel.create({
        id: nanoid(),
        creditNoteId,
        originalBillId: originalBill.id,
        productId: item.productId,
        productName: item.productName,
        quantityReturned: item.quantity,
        returnReason: returnReason || 'other',
        returnType,
        returnDate: new Date().toISOString(),
        tenantId
      });

      stockRestoredList.push({
        productName: item.productName,
        quantityRestored: item.quantity,
        newStock: prod ? prod.stock : 0
      });
    }

    // Build notifications
    await createNotification(
      tenantId,
      'Sales Return Processed',
      `Return Note ${creditNoteNumber} processed for Invoice ${originalBill.billNumber}.`,
      'general'
    );

    res.status(201).json({
      success: true,
      creditNote: newCreditNote,
      stockRestored: stockRestoredList,
      cashbookEntry: cashbookRetEntry,
      message: warningMsg || (balanceType === 'collect_from_customer'
        ? `Exchange processed. Collect ₹${collectAmount.toFixed(2)} from customer.`
        : `Return processed successfully. ₹${refundAmount.toFixed(2)} refunded.`)
    });

  } catch (error: any) {
    console.error('Error processing return:', error);
    res.status(500).json({ message: error.message || 'Failed to process return & exchange.' });
  }
});

// List all sales return documents for tenant
router.get('/returns/list', async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const creditNotes = await BillModel.find({
      tenantId,
      documentType: 'credit_note'
    }).sort({ createdAt: -1 });

    res.json(creditNotes);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch sales returns list' });
  }
});

// Return Rate per product plus reasons breakdown
router.get('/returns/analytics', async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId;

    // Fetch invoices to find active sold items
    const salesInvoices = await BillModel.find({
      tenantId,
      documentType: 'invoice'
    });

    const soldQtyMap: { [productId: string]: { name: string; qty: number } } = {};
    for (const bill of salesInvoices) {
      for (const item of bill.items) {
        if (item.productId) {
          if (!soldQtyMap[item.productId]) {
            soldQtyMap[item.productId] = { name: item.productName || 'Unknown Product', qty: 0 };
          }
          soldQtyMap[item.productId].qty += (item.quantity || 0);
        }
      }
    }

    // Fetch all logs of returns
    const logs = await ReturnLogModel.find({ tenantId });

    const returnedQtyMap: { [productId: string]: number } = {};
    const productReasonMap: { [productId: string]: { [reason: string]: number } } = {};

    for (const log of logs) {
      if (log.productId) {
        returnedQtyMap[log.productId] = (returnedQtyMap[log.productId] || 0) + (log.quantityReturned || 0);

        if (!productReasonMap[log.productId]) {
          productReasonMap[log.productId] = {};
        }
        const reason = log.returnReason || 'other';
        productReasonMap[log.productId][reason] = (productReasonMap[log.productId][reason] || 0) + log.quantityReturned;
      }
    }

    // Reason breakdown count
    const reasonsBreakdown: { [reason: string]: number } = {
      damaged: 0,
      quality_issue: 0,
      wrong_item: 0,
      customer_changed_mind: 0,
      expired: 0,
      other: 0
    };

    for (const log of logs) {
      const reason = log.returnReason || 'other';
      if (reasonsBreakdown[reason] !== undefined) {
        reasonsBreakdown[reason] += log.quantityReturned;
      } else {
        reasonsBreakdown.other += log.quantityReturned;
      }
    }

    // Compute products list
    const topReturnedProducts = [];
    for (const productId of Object.keys(returnedQtyMap)) {
      const soldInfo = soldQtyMap[productId] || { name: 'Unknown Product', qty: 0 };
      const returned = returnedQtyMap[productId];
      const sold = Math.max(returned, soldInfo.qty); // Guarantee rate <= 100%

      const rateVal = sold > 0 ? (returned / sold) * 100 : 0;
      const returnRate = `${Math.round(rateVal)}%`;

      let risk = 'low';
      if (rateVal > 10) risk = 'high';
      else if (rateVal > 5) risk = 'medium';

      // Find primary reason for product
      let topReason = 'other';
      let maxQty = 0;
      if (productReasonMap[productId]) {
        for (const [r, qty] of Object.entries(productReasonMap[productId])) {
          if (qty > maxQty) {
            maxQty = qty;
            topReason = r;
          }
        }
      }

      topReturnedProducts.push({
        productId,
        productName: soldInfo.name,
        totalSold: sold,
        totalReturned: returned,
        returnRate,
        risk,
        topReason
      });
    }

    topReturnedProducts.sort((a, b) => b.totalReturned - a.totalReturned);

    // Sum refund amounts
    const creditNotes = await BillModel.find({ tenantId, documentType: 'credit_note' });
    const totalRefundsIssued = creditNotes.reduce((acc, cn) => acc + (cn.refundAmount || 0), 0);

    res.json({
      period: 'Last 30 days',
      topReturnedProducts,
      reasonsBreakdown,
      totalRefundsIssued,
      totalReturnsCount: creditNotes.length
    });

  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch returns analytics' });
  }
});

// Find individual return linked to a specific original billing ID
router.get('/returns/by-bill/:billId', async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const { billId } = req.params;
    const returns = await BillModel.find({
      tenantId,
      linkedBillId: billId,
      documentType: 'credit_note'
    });
    res.json(returns);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch return notes' });
  }
});

// Single return credit note with the original billing invoice
router.get('/returns/:id', async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const returnBill = await BillModel.findOne({
      tenantId,
      id,
      documentType: 'credit_note'
    });

    if (!returnBill) {
      return res.status(404).json({ message: 'Return credit note not found' });
    }

    const originalBill = await BillModel.findOne({
      tenantId,
      id: returnBill.linkedBillId
    });

    res.json({
      returnBill,
      originalBill
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch return note' });
  }
});

export default router;
