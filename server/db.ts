import mongoose, { Schema, model } from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lite-billing';

let isConnected = false;

export async function connectToDatabase() {
  if (isConnected) return;
  
  if (!process.env.MONGODB_URI) {
    console.warn('WARNING: MONGODB_URI is not set in environment variables. Falling back to local MongoDB.');
  }

  try {
    const options = {
      serverSelectionTimeoutMS: 5000, // 5 seconds timeout
      socketTimeoutMS: 45000,
      family: 4, // Force IPv4
    };

    await mongoose.connect(MONGODB_URI, options);
    isConnected = true;
    console.log('Successfully connected to MongoDB');
  } catch (error: any) {
    console.error('--- MONGODB CONNECTION ERROR ---');
    console.error('Message:', error.message);
    
    if (error.message.includes('MongooseServerSelectionError') || error.message.includes('MongoNetworkError')) {
      console.error('ACTION REQUIRED: This error usually means your IP address is not whitelisted in MongoDB Atlas.');
      console.error('Please go to MongoDB Atlas -> Network Access -> Add IP Address -> Allow Access From Anywhere (0.0.0.0/0).');
    }
    
    // Don't throw here to allow the server to at least start, 
    // although DB operations will fail.
    // Or throw if we want to fail fast. 
    // Given the context, failing fast is better so the user sees the logs immediately.
    throw error;
  }
}

// Interfaces (keeping for type safety and consistency)
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
  slug: string;
  ownerId: string;
  gstin?: string;
  state?: string;
  stateCode?: string;
  businessType?: 'B2B' | 'B2C';
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  tenantId: string;
  hsnCode: string;
  gstRate: number;
  barcode?: string;
}

// ... (other interfaces same as before)
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
  items: BillItem[];
  totalAmount: number;
  discountAmount: number;
  pointsRedeemed: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  payments: BillPayment[];
  tenantId: string;
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
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  tenantId: string;
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
  tenantId: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: 'Rent' | 'Salary' | 'Transport' | 'Utilities' | 'Marketing' | 'Other';
  date: string;
  note: string;
  tenantId: string;
}

export interface CashBook {
  id: string;
  date: string;
  type: 'in' | 'out';
  amount: number;
  note: string;
  referenceType?: 'sale' | 'expense' | 'purchase' | 'manual';
  referenceId?: string;
  tenantId: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  upiId: string;
  openingBalance: number;
  tenantId: string;
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
  tenantId: string;
}

export interface Payment {
  id: string;
  billId: string;
  billType: 'sale' | 'purchase';
  amount: number;
  paymentMode: 'cash' | 'upi' | 'card' | 'bank_transfer' | 'credit';
  paymentDate: string;
  note: string;
  tenantId: string;
}

// Mongoose Schemas
const UserSchema = new Schema<User>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  tenantId: { type: String, required: true },
  role: { type: String, enum: ['admin', 'staff'], default: 'admin' }
});

const TenantSchema = new Schema<Tenant>({
  id: { type: String, required: true, unique: true },
  shopName: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  ownerId: { type: String, required: true },
  gstin: String,
  state: String,
  stateCode: String,
  businessType: { type: String, enum: ['B2B', 'B2C'] }
});

const ProductSchema = new Schema<Product>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, required: true },
  category: { type: String, required: true },
  tenantId: { type: String, required: true },
  hsnCode: { type: String, required: true },
  gstRate: { type: Number, required: true },
  barcode: String
});

const CustomerSchema = new Schema<Customer>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  tenantId: { type: String, required: true },
  notes: String,
  totalSpent: { type: Number, default: 0 },
  totalOrders: { type: Number, default: 0 },
  lastPurchaseDate: String,
  loyaltyPoints: { type: Number, default: 0 }
});

const BillSchema = new Schema<Bill>({
  id: { type: String, required: true, unique: true },
  billNumber: { type: String, required: true },
  customerId: String,
  items: [{
    productId: String,
    productName: String,
    quantity: Number,
    price: Number,
    hsnCode: String,
    gstRate: Number,
    gstAmount: Number,
    lineTotal: Number
  }],
  totalAmount: Number,
  discountAmount: { type: Number, default: 0 },
  pointsRedeemed: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['paid', 'partial', 'unpaid'] },
  payments: [{
    mode: String,
    amount: Number,
    reference: String,
    paidAt: String
  }],
  tenantId: { type: String, required: true },
  createdAt: { type: String, required: true },
  documentType: { type: String, enum: ['invoice', 'estimate', 'credit_note', 'challan'] },
  customerGstin: String,
  customerState: String,
  isInterState: Boolean,
  gstBreakdown: {
    cgst: Number,
    sgst: Number,
    igst: Number,
    totalGst: Number
  },
  subTotal: Number,
  linkedBillId: String,
  convertedToInvoice: Boolean
});

const LoyaltyConfigSchema = new Schema<LoyaltyConfig>({
  tenantId: { type: String, required: true, unique: true },
  pointsPerRupee: Number,
  minRedeemPoints: Number,
  valuePerPoint: Number,
  enabled: Boolean
});

const CouponSchema = new Schema<Coupon>({
  id: { type: String, required: true, unique: true },
  tenantId: { type: String, required: true },
  code: { type: String, required: true },
  discountType: { type: String, enum: ['percentage', 'fixed'] },
  value: Number,
  minBillAmount: Number,
  expiryDate: String,
  active: Boolean
});

const SupplierSchema = new Schema<Supplier>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phone: String,
  email: String,
  address: String,
  tenantId: { type: String, required: true },
  createdAt: String
});

const PurchaseBillSchema = new Schema<PurchaseBill>({
  id: { type: String, required: true, unique: true },
  billNumber: String,
  supplierId: String,
  supplierName: String,
  items: [{
    productId: String,
    productName: String,
    quantity: Number,
    purchasePrice: Number
  }],
  totalAmount: Number,
  paymentStatus: { type: String, enum: ['paid', 'unpaid'] },
  billDate: String,
  notes: String,
  tenantId: { type: String, required: true }
});

const ExpenseSchema = new Schema<Expense>({
  id: { type: String, required: true, unique: true },
  title: String,
  amount: Number,
  category: { type: String, enum: ['Rent', 'Salary', 'Transport', 'Utilities', 'Marketing', 'Other'] },
  date: String,
  note: String,
  tenantId: { type: String, required: true }
});

const CashBookSchema = new Schema<CashBook>({
  id: { type: String, required: true, unique: true },
  date: String,
  type: { type: String, enum: ['in', 'out'] },
  amount: Number,
  note: String,
  referenceType: String,
  referenceId: String,
  tenantId: { type: String, required: true }
});

const BankAccountSchema = new Schema<BankAccount>({
  id: { type: String, required: true, unique: true },
  bankName: String,
  accountNumber: String,
  ifsc: String,
  upiId: String,
  openingBalance: Number,
  tenantId: { type: String, required: true }
});

const BankTransactionSchema = new Schema<BankTransaction>({
  id: { type: String, required: true, unique: true },
  bankAccountId: String,
  date: String,
  type: { type: String, enum: ['credit', 'debit'] },
  amount: Number,
  note: String,
  referenceType: String,
  referenceId: String,
  tenantId: { type: String, required: true }
});

const PaymentSchema = new Schema<Payment>({
  id: { type: String, required: true, unique: true },
  billId: String,
  billType: { type: String, enum: ['sale', 'purchase'] },
  amount: Number,
  paymentMode: String,
  paymentDate: String,
  note: String,
  tenantId: { type: String, required: true }
});

// Models
export const UserModel = model('User', UserSchema);
export const TenantModel = model('Tenant', TenantSchema);
export const ProductModel = model('Product', ProductSchema);
export const CustomerModel = model('Customer', CustomerSchema);
export const BillModel = model('Bill', BillSchema);
export const LoyaltyConfigModel = model('LoyaltyConfig', LoyaltyConfigSchema);
export const CouponModel = model('Coupon', CouponSchema);
export const SupplierModel = model('Supplier', SupplierSchema);
export const PurchaseBillModel = model('PurchaseBill', PurchaseBillSchema);
export const ExpenseModel = model('Expense', ExpenseSchema);
export const CashBookModel = model('CashBook', CashBookSchema);
export const BankAccountModel = model('BankAccount', BankAccountSchema);
export const BankTransactionModel = model('BankTransaction', BankTransactionSchema);
export const PaymentModel = model('Payment', PaymentSchema);

// Compat Layer for existing services that expect a "Data" object
// NOTE: This is a heavy operation if done literally. 
// Instead, I'll refactor the services to use the models directly.
// This getDb will be legacy.
export async function getDb() {
  await connectToDatabase();
  return {
    data: {
      users: await UserModel.find(),
      tenants: await TenantModel.find(),
      products: await ProductModel.find(),
      customers: await CustomerModel.find(),
      bills: await BillModel.find(),
      loyaltyConfigs: await LoyaltyConfigModel.find(),
      coupons: await CouponModel.find(),
      suppliers: await SupplierModel.find(),
      purchaseBills: await PurchaseBillModel.find(),
      expenses: await ExpenseModel.find(),
      cashBook: await CashBookModel.find(),
      bankAccounts: await BankAccountModel.find(),
      bankTransactions: await BankTransactionModel.find(),
      payments: await PaymentModel.find(),
    },
    write: async () => {} // No-op for MongoDB as we save per model
  };
}
