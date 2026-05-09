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
  quantity: number;
  price: number;
  name?: string;
}

export interface Bill {
  id: string;
  billNumber: string;
  customerId?: string;
  items: BillItem[];
  totalAmount: number;
  discountAmount: number;
  pointsRedeemed: number;
  paymentStatus: 'paid' | 'unpaid';
  createdAt: string;
}

export interface DashboardData {
  todaySales: number;
  todayBillCount: number;
  pendingPayments: number;
  lowStockItems: number;
  bestCustomers?: Customer[];
  topProducts?: { name: string, quantity: number, revenue: number }[];
}
