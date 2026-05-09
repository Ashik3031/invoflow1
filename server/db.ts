import { JSONFilePreset } from 'lowdb/node';
import { nanoid } from 'nanoid';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  tenantId: string;
  role: 'admin' | 'staff';
}

export interface Tenant {
  id: string;
  shopName: string;
  ownerId: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  tenantId: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  tenantId: string;
  notes: string;
  totalSpent: number;
  totalOrders: number;
  lastPurchaseDate?: string;
  loyaltyPoints: number;
}

export interface LoyaltyConfig {
  tenantId: string;
  pointsPerRupee: number;
  minRedeemPoints: number;
  valuePerPoint: number;
  enabled: boolean;
}

export interface Coupon {
  id: string;
  tenantId: string;
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
  tenantId: string;
  createdAt: string;
}

export interface Data {
  users: User[];
  tenants: Tenant[];
  products: Product[];
  customers: Customer[];
  bills: Bill[];
  loyaltyConfigs: LoyaltyConfig[];
  coupons: Coupon[];
}

const defaultData: Data = {
  users: [],
  tenants: [],
  products: [],
  customers: [],
  bills: [],
  loyaltyConfigs: [],
  coupons: [],
};

export async function getDb() {
  return await JSONFilePreset<Data>('db.json', defaultData);
}
