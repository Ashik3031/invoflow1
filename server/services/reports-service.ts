import express from 'express';
import { 
  BillModel, 
  ProductModel, 
  CustomerModel, 
  PurchaseBillModel, 
  ExpenseModel, 
  PaymentModel, 
  LoyaltyConfigModel 
} from '../db.js';
import { AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Helper to check date range
const isInRange = (dateStr: string, from?: string, to?: string) => {
  const date = new Date(dateStr);
  if (from && date < new Date(from)) return false;
  if (to && date > new Date(to)) return false;
  return true;
};

// Report 1: Daily/Weekly/Monthly Sales Summary
router.get('/sales-daily', async (req: AuthRequest, res) => {
  const { tenantId } = req.user!;
  const { from, to, groupBy = 'daily' } = req.query as { from?: string; to?: string; groupBy?: 'daily' | 'weekly' | 'monthly' };

  const query: any = { tenantId, documentType: 'invoice' };
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = from.includes('T') ? from : `${from}T00:00:00.000Z`;
    if (to) query.createdAt.$lte = to.includes('T') ? to : `${to}T23:59:59.999Z`;
  }

  const sales = await BillModel.find(query);
  const groups: Record<string, { date: string, label: string, totalSales: number, billCount: number }> = {};

  sales.forEach(bill => {
    const rawDate = new Date(bill.createdAt);
    if (isNaN(rawDate.getTime())) return;

    let key = '';
    let label = '';

    if (groupBy === 'monthly') {
      const year = rawDate.getFullYear();
      const monthStr = String(rawDate.getMonth() + 1).padStart(2, '0');
      key = `${year}-${monthStr}`;
      
      const localeMonth = rawDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      label = localeMonth;
    } else if (groupBy === 'weekly') {
      const day = rawDate.getDay();
      const diff = rawDate.getDate() - day;
      const startOfWeek = new Date(rawDate);
      startOfWeek.setDate(diff);
      
      const year = startOfWeek.getFullYear();
      const monthStr = String(startOfWeek.getMonth() + 1).padStart(2, '0');
      const dayStr = String(startOfWeek.getDate()).padStart(2, '0');
      key = `${year}-${monthStr}-${dayStr}`;
      
      const localeWeek = startOfWeek.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
      label = `Week of ${localeWeek}`;
    } else {
      const year = rawDate.getFullYear();
      const monthStr = String(rawDate.getMonth() + 1).padStart(2, '0');
      const dayStr = String(rawDate.getDate()).padStart(2, '0');
      key = `${year}-${monthStr}-${dayStr}`;
      
      label = rawDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    }

    if (!groups[key]) {
      groups[key] = { date: key, label, totalSales: 0, billCount: 0 };
    }
    groups[key].totalSales += bill.totalAmount;
    groups[key].billCount += 1;
  });

  res.json(Object.values(groups).sort((a, b) => a.date.localeCompare(b.date)));
});

// Detailed Sold Items & Invoices for a specific Period Key
router.get('/sales-period-details', async (req: AuthRequest, res) => {
  try {
    const { tenantId } = req.user!;
    const { periodKey, groupBy = 'daily' } = req.query as { periodKey?: string; groupBy?: 'daily' | 'weekly' | 'monthly' };

    if (!periodKey) {
      return res.status(400).json({ message: 'periodKey is required' });
    }

    let startStr = '';
    let endStr = '';

    if (groupBy === 'monthly') {
      const parts = periodKey.split('-');
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      if (isNaN(year) || isNaN(month)) {
        return res.status(400).json({ message: 'Invalid monthly key format' });
      }
      startStr = new Date(year, month - 1, 1, 0, 0, 0, 0).toISOString();
      endStr = new Date(year, month, 0, 23, 59, 59, 999).toISOString();
    } else if (groupBy === 'weekly') {
      const parts = periodKey.split('-');
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const day = parseInt(parts[2]);
      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        return res.status(400).json({ message: 'Invalid weekly key format' });
      }
      startStr = new Date(year, month - 1, day, 0, 0, 0, 0).toISOString();
      const endDate = new Date(year, month - 1, day + 6, 23, 59, 59, 999);
      endStr = endDate.toISOString();
    } else {
      // daily
      const parts = periodKey.split('-');
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const day = parseInt(parts[2]);
      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        return res.status(400).json({ message: 'Invalid daily key format' });
      }
      startStr = new Date(year, month - 1, day, 0, 0, 0, 0).toISOString();
      endStr = new Date(year, month - 1, day, 23, 59, 59, 999).toISOString();
    }

    const query: any = {
      tenantId,
      documentType: 'invoice',
      createdAt: { $gte: startStr, $lte: endStr }
    };

    const periodBills = await BillModel.find(query).sort({ createdAt: 1 });

    const itemGrouping: Record<string, { productId: string; productName: string; totalQty: number; totalRevenue: number; avgPrice: number; billCount: number }> = {};

    periodBills.forEach(bill => {
      bill.items.forEach(item => {
        const id = item.productId || 'unknown';
        if (!itemGrouping[id]) {
          itemGrouping[id] = {
            productId: id,
            productName: item.productName || 'Unknown Product',
            totalQty: 0,
            totalRevenue: 0,
            avgPrice: 0,
            billCount: 0
          };
        }
        itemGrouping[id].totalQty += item.quantity || 0;
        itemGrouping[id].totalRevenue += item.lineTotal || 0;
        itemGrouping[id].billCount += 1;
      });
    });

    const itemsSold = Object.values(itemGrouping).map(item => {
      item.avgPrice = item.totalQty > 0 ? (item.totalRevenue / item.totalQty) : 0;
      return item;
    }).sort((a, b) => b.totalQty - a.totalQty);

    const billsList = periodBills.map(b => ({
      id: b.id,
      billNumber: b.billNumber,
      customerName: b.customerName || 'Walk-in',
      totalAmount: b.totalAmount,
      paymentStatus: b.paymentStatus,
      createdAt: b.createdAt
    }));

    res.json({
      periodKey,
      groupBy,
      startDate: startStr,
      endDate: endStr,
      totalSales: periodBills.reduce((sum, b) => sum + b.totalAmount, 0),
      billCount: periodBills.length,
      items: itemsSold,
      bills: billsList
    });
  } catch (err: any) {
    console.error('Error fetching period details:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Report 2: Top Selling Products
router.get('/top-products', async (req: AuthRequest, res) => {
  const { tenantId } = req.user!;
  const { from, to, limit = '10' } = req.query as { from?: string; to?: string; limit?: string };

  const query: any = { tenantId, documentType: 'invoice' };
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = from;
    if (to) query.createdAt.$lte = to;
  }

  const sales = await BillModel.find(query);
  const productStats: Record<string, { productName: string, totalQtySold: number, totalRevenue: number }> = {};

  sales.forEach(bill => {
    bill.items.forEach(item => {
      if (!productStats[item.productId]) {
        productStats[item.productId] = { productName: item.productName, totalQtySold: 0, totalRevenue: 0 };
      }
      productStats[item.productId].totalQtySold += item.quantity;
      productStats[item.productId].totalRevenue += item.lineTotal;
    });
  });

  const result = Object.values(productStats)
    .sort((a, b) => b.totalQtySold - a.totalQtySold)
    .slice(0, parseInt(limit));

  res.json(result);
});

// Report 3: Best Customers
router.get('/top-customers', async (req: AuthRequest, res) => {
  const { tenantId } = req.user!;
  const { from, to, limit = '10' } = req.query as { from?: string; to?: string; limit?: string };

  const query: any = { tenantId, documentType: 'invoice' };
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = from;
    if (to) query.createdAt.$lte = to;
  }

  const sales = await BillModel.find(query);
  const customerStats: Record<string, { customerId: string, totalSpent: number, orderCount: number, lastPurchase: string }> = {};

  sales.forEach(bill => {
    if (!bill.customerId) return;
    if (!customerStats[bill.customerId]) {
      customerStats[bill.customerId] = { customerId: bill.customerId, totalSpent: 0, orderCount: 0, lastPurchase: bill.createdAt };
    }
    customerStats[bill.customerId].totalSpent += bill.totalAmount;
    customerStats[bill.customerId].orderCount += 1;
    if (new Date(bill.createdAt) > new Date(customerStats[bill.customerId].lastPurchase)) {
      customerStats[bill.customerId].lastPurchase = bill.createdAt;
    }
  });

  const result = [];
  for (const stat of Object.values(customerStats)) {
    const customer = await CustomerModel.findOne({ id: stat.customerId, tenantId });
    result.push({
      ...stat,
      customerName: customer?.name || 'Unknown'
    });
  }

  result.sort((a, b) => b.totalSpent - a.totalSpent);
  const finalResult = result.slice(0, parseInt(limit));

  res.json(finalResult);
});

// Report 4: Stock Ledger
router.get('/stock-ledger/:productId', async (req: AuthRequest, res) => {
  const { tenantId } = req.user!;
  const { productId } = req.params;
  const { from, to } = req.query as { from?: string; to?: string };

  const product = await ProductModel.findOne({ id: productId, tenantId });
  if (!product) return res.status(404).json({ message: 'Product not found' });

  // Stream A: Purchases
  const purchases = await PurchaseBillModel.find({ tenantId });
  const purchaseEntries = purchases
    .filter(b => isInRange(b.billDate, from, to))
    .flatMap(b => b.items.filter(i => i.productId === productId).map(i => ({
      date: b.billDate,
      type: 'purchase_in',
      qty: i.quantity,
      reference: b.billNumber
    })));

  // Stream B: Sales
  const sales = await BillModel.find({ tenantId, documentType: 'invoice' });
  const saleEntries = sales
    .filter(b => isInRange(b.createdAt, from, to))
    .flatMap(b => b.items.filter(i => i.productId === productId).map(i => ({
      date: b.createdAt,
      type: 'sale_out',
      qty: -i.quantity,
      reference: b.billNumber
    })));

  const allEntries = [...purchaseEntries, ...saleEntries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  res.json(allEntries);
});

// Report 5: Low Stock Prediction
router.get('/low-stock', async (req: AuthRequest, res) => {
  const { tenantId } = req.user!;
  const { daysThreshold = '7' } = req.query as { daysThreshold?: string };
  const threshold = parseInt(daysThreshold);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const lastMonthSales = await BillModel.find({ 
    tenantId, 
    documentType: 'invoice', 
    createdAt: { $gte: thirtyDaysAgo.toISOString() }
  });

  const productSalesQty: Record<string, number> = {};
  lastMonthSales.forEach(bill => {
    bill.items.forEach(item => {
      productSalesQty[item.productId] = (productSalesQty[item.productId] || 0) + item.quantity;
    });
  });

  const products = await ProductModel.find({ tenantId });
  const prediction = products
    .map(p => {
      const avgDailySales = (productSalesQty[p.id] || 0) / 30;
      const daysRemaining = avgDailySales > 0 ? p.stock / avgDailySales : Infinity;
      return {
        productName: p.name,
        currentStock: p.stock,
        avgDailySales: avgDailySales.toFixed(2),
        daysRemaining: daysRemaining === Infinity ? 'N/A' : daysRemaining.toFixed(1)
      };
    })
    .filter(p => p.daysRemaining !== 'N/A' && parseFloat(p.daysRemaining) < threshold);

  res.json(prediction);
});

// Report 6: Revenue Trend
router.get('/revenue-trend', async (req: AuthRequest, res) => {
  const { tenantId } = req.user!;
  const { months = '6' } = req.query as { months?: string };
  const limit = parseInt(months);

  const sales = await BillModel.find({ tenantId, documentType: 'invoice' });
  const monthlyGroups: Record<string, { year: number, month: number, revenue: number }> = {};

  sales.forEach(bill => {
    const d = new Date(bill.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    if (!monthlyGroups[key]) {
      monthlyGroups[key] = { year: d.getFullYear(), month: d.getMonth() + 1, revenue: 0 };
    }
    monthlyGroups[key].revenue += bill.totalAmount;
  });

  const result = Object.values(monthlyGroups)
    .sort((a, b) => (a.year * 100 + a.month) - (b.year * 100 + b.month))
    .slice(-limit);

  res.json(result);
});

// Report 7: GST Summary
router.get('/gst-summary', async (req: AuthRequest, res) => {
  const { tenantId } = req.user!;
  const { month, year } = req.query as { month: string, year: string };

  const startDate = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString();
  const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59).toISOString();

  const sales = await BillModel.find({
    tenantId,
    documentType: 'invoice',
    createdAt: { $gte: startDate, $lte: endDate }
  });

  const summary = {
    month: `${new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long' })} ${year}`,
    taxableSales: sales.reduce((acc, b) => acc + (b.subTotal || 0), 0),
    cgst: sales.reduce((acc, b) => acc + (b.gstBreakdown?.cgst || 0), 0),
    sgst: sales.reduce((acc, b) => acc + (b.gstBreakdown?.sgst || 0), 0),
    igst: sales.reduce((acc, b) => acc + (b.gstBreakdown?.igst || 0), 0),
    totalTaxDue: sales.reduce((acc, b) => acc + (b.gstBreakdown?.totalGst || 0), 0)
  };

  res.json(summary);
});

// Report 8: Expense Summary
router.get('/expense-summary', async (req: AuthRequest, res) => {
  const { tenantId } = req.user!;
  const { from, to } = req.query as { from?: string, to?: string };

  const query: any = { tenantId };
  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = from;
    if (to) query.date.$lte = to;
  }

  const expenses = await ExpenseModel.find(query);

  const categorySummary: Record<string, number> = {};
  expenses.forEach(e => {
    categorySummary[e.category] = (categorySummary[e.category] || 0) + e.amount;
  });

  res.json(Object.entries(categorySummary).map(([category, total]) => ({ category, total })));
});

// Report 9: Payment Mode Summary
router.get('/payment-mode', async (req: AuthRequest, res) => {
  const { tenantId } = req.user!;
  const { from, to } = req.query as { from?: string, to?: string };

  const query: any = { tenantId };
  if (from || to) {
    query.paymentDate = {};
    if (from) query.paymentDate.$gte = from;
    if (to) query.paymentDate.$lte = to;
  }

  const payments = await PaymentModel.find(query);

  const modeSummary: Record<string, number> = {};
  payments.forEach(p => {
    modeSummary[p.paymentMode] = (modeSummary[p.paymentMode] || 0) + p.amount;
  });

  res.json(Object.entries(modeSummary).map(([mode, total]) => ({ mode, total })));
});

// Report 10: Inventory Valuation
router.get('/inventory-valuation', async (req: AuthRequest, res) => {
  const { tenantId } = req.user!;
  const products = await ProductModel.find({ tenantId });
  
  const valuation = products.map(p => ({
    name: p.name,
    stock: p.stock,
    price: p.price,
    value: p.stock * p.price
  }));

  res.json({
    totalValuation: valuation.reduce((acc, p) => acc + p.value, 0),
    items: valuation
  });
});

// Report 11: Customer Loyalty
router.get('/customer-loyalty', async (req: AuthRequest, res) => {
  const { tenantId } = req.user!;
  const customers = await CustomerModel.find({ tenantId, loyaltyPoints: { $gt: 0 } });
  const config = await LoyaltyConfigModel.findOne({ tenantId });
  
  const loyalty = customers.map(c => ({
    name: c.name,
    phone: c.phone,
    points: c.loyaltyPoints,
    value: c.loyaltyPoints * (config?.valuePerPoint || 0)
  })).sort((a, b) => b.points - a.points);

  res.json(loyalty);
});

// Report 12: Product Profitability
router.get('/product-profitability', async (req: AuthRequest, res) => {
  const { tenantId } = req.user!;
  const sales = await BillModel.find({ tenantId, documentType: 'invoice' });
  const purchaseBills = await PurchaseBillModel.find({ tenantId });
  
  const profitMap: Record<string, { name: string, revenue: number, cost: number, profit: number }> = {};

  for (const bill of sales) {
    for (const item of bill.items) {
      if (!profitMap[item.productId]) {
        profitMap[item.productId] = { name: item.productName, revenue: 0, cost: 0, profit: 0 };
      }
      profitMap[item.productId].revenue += item.lineTotal;
      
      const purchaseItem = purchaseBills
        .flatMap(pb => pb.items)
        .find(pi => pi.productId === item.productId);
      
      const unitCost = purchaseItem?.purchasePrice || (item.price * 0.7);
      profitMap[item.productId].cost += unitCost * item.quantity;
      profitMap[item.productId].profit = profitMap[item.productId].revenue - profitMap[item.productId].cost;
    }
  }

  res.json(Object.values(profitMap).sort((a, b) => b.profit - a.profit));
});

// Report 13: Purchase Trend
router.get('/purchase-trend', async (req: AuthRequest, res) => {
  const { tenantId } = req.user!;
  const purchases = await PurchaseBillModel.find({ tenantId });
  const monthly: Record<string, any> = {};

  purchases.forEach(p => {
    const d = new Date(p.billDate);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    if (!monthly[key]) monthly[key] = { date: key, amount: 0 };
    monthly[key].amount += p.totalAmount;
  });

  res.json(Object.values(monthly).sort((a: any, b: any) => a.date.localeCompare(b.date)));
});

// Report 14: Category Sales
router.get('/category-sales', async (req: AuthRequest, res) => {
  const { tenantId } = req.user!;
  const bills = await BillModel.find({ tenantId, documentType: 'invoice' });
  const categories: Record<string, number> = {};

  for (const b of bills) {
    for (const i of b.items) {
      const product = await ProductModel.findOne({ id: i.productId, tenantId });
      const cat = product?.category || 'Uncategorized';
      categories[cat] = (categories[cat] || 0) + i.lineTotal;
    }
  }

  res.json(Object.entries(categories).map(([name, value]) => ({ name, value })));
});

// Report 15: Sales by Payment Status
router.get('/sales-status', async (req: AuthRequest, res) => {
  const { tenantId } = req.user!;
  const bills = await BillModel.find({ tenantId, documentType: 'invoice' });
  const statusSummary: Record<string, number> = { paid: 0, unpaid: 0, partial: 0 };

  bills.forEach(b => {
    statusSummary[b.paymentStatus] = (statusSummary[b.paymentStatus] || 0) + b.totalAmount;
  });

  res.json(Object.entries(statusSummary).map(([name, value]) => ({ name, value })));
});

export default router;
