export interface User {
  id: string;
  name: string;
  tenantId: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  hsnCode: string;
  gstRate: number;
  barcode?: string;
  purchasePrice?: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  notes: string;
  totalSpent: number;
  totalOrders: number;
  lastPurchaseDate?: string;
  loyaltyPoints: number;
  storeCredit?: number;
}

export interface LoyaltyConfig {
  pointsPerRupee: number;
  minRedeemPoints: number;
  valuePerPoint: number;
  enabled: boolean;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  value: number;
  minBillAmount: number;
  expiryDate: string;
  active: boolean;
}

export interface BillItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  hsnCode: string;
  gstRate: number;
  gstAmount: number;
  lineTotal: number;
}

export interface BillPayment {
  mode: 'cash' | 'upi' | 'card' | 'credit' | 'bank_transfer';
  amount: number;
  reference?: string;
  paidAt: string;
}

export interface Bill {
  id: string;
  billNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  items: BillItem[];
  totalAmount: number;
  discountAmount: number;
  pointsRedeemed: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid' | 'refunded';
  payments: BillPayment[];
  createdAt: string;
  documentType: 'invoice' | 'estimate' | 'credit_note' | 'challan';
  customerGstin?: string;
  customerState?: string;
  isInterState: boolean;
  gstBreakdown: {
    cgst: number;
    sgst: number;
    igst: number;
    totalGst: number;
  };
  subTotal: number;
  linkedBillId?: string;
  convertedToInvoice?: boolean;
  linkedBillNumber?: string;
  returnType?: 'full_return' | 'partial_return' | 'exchange';
  returnReason?: string;
  returnReasonNote?: string;
  exchangeItems?: any[];
  refundAmount?: number;
  collectAmount?: number;
  balanceType?: 'refund_to_customer' | 'collect_from_customer' | 'even';
  refundMode?: string;
  refundNote?: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  createdAt: string;
}

export interface PurchaseBillItem {
  productId: string;
  productName: string;
  quantity: number;
  purchasePrice: number;
}

export interface PurchaseBill {
  id: string;
  billNumber: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseBillItem[];
  totalAmount: number;
  paymentStatus: 'paid' | 'unpaid';
  billDate: string;
  notes: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: 'Rent' | 'Salary' | 'Transport' | 'Utilities' | 'Marketing' | 'Other';
  date: string;
  note: string;
}

export interface CashBook {
  id: string;
  date: string;
  type: 'in' | 'out';
  amount: number;
  note: string;
  referenceType?: 'sale' | 'expense' | 'purchase' | 'manual';
  referenceId?: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  upiId: string;
  openingBalance: number;
  balance?: number; // Calculated on frontend or backend
}

export interface BankTransaction {
  id: string;
  bankAccountId: string;
  date: string;
  type: 'credit' | 'debit';
  amount: number;
  note: string;
  referenceType?: 'sale' | 'expense' | 'purchase' | 'manual';
  referenceId?: string;
}

export interface Payment {
  id: string;
  billId: string;
  billType: 'sale' | 'purchase';
  amount: number;
  paymentMode: 'cash' | 'upi' | 'card' | 'bank_transfer' | 'credit';
  paymentDate: string;
  note: string;
}

export interface ProfitLossData {
  period: { from: string; to: string };
  revenue: number;
  costOfGoods: number;
  grossProfit: number;
  operatingExpenses: number;
  netProfit: number;
  profitMargin: string;
}

export interface DashboardData {
  todaySales: number;
  todayBillCount: number;
  pendingPayments: number;
  lowStockItems: number;
  bestCustomers?: Customer[];
  topProducts?: { 
    id: string;
    name: string; 
    quantitySold: number; 
    revenue: number; 
    stock: number; 
    category: string;
  }[];
  todayUnitsSold?: number;
  totalInventoryCount?: number;
  totalCustomersCount?: number;
  chartData?: { name: string; value: number; expense: number }[];
}
