import mongoose, { Schema, model } from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

mongoose.set('bufferCommands', false);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ashikash202_db_user:CHTI9n41W2DJsYhC@cluster0.oes6jcf.mongodb.net/lite-billing?appName=Cluster0';

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
    // and let Mongoose automatically retry in the background.
    console.error('Mongoose connection failed initially. App server is starting anyway; Mongoose will automatically retry connecting in the background.');
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
  purchasePrice?: number;
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
  storeCredit?: number;
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
  customerName: string;
  customerPhone?: string;
  items: BillItem[];
  totalAmount: number;
  discountAmount: number;
  pointsRedeemed: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid' | 'refunded';
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
  
  // Return / exchange fields (only populated when documentType === 'credit_note')
  returnType?: 'full_return' | 'partial_return' | 'exchange' | null;
  linkedBillNumber?: string | null;
  returnReason?: 'damaged' | 'wrong_item' | 'customer_changed_mind' | 'quality_issue' | 'expired' | 'other' | null;
  returnReasonNote?: string;
  exchangeItems?: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    gstRate: number;
    gstAmount: number;
    lineTotal: number;
  }[];
  refundAmount?: number;
  collectAmount?: number;
  balanceType?: 'refund_to_customer' | 'collect_from_customer' | 'even' | null;
  refundMode?: 'cash' | 'upi' | 'store_credit' | 'bank_transfer' | null;
  refundNote?: string;
  processedBy?: string;
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
  gstRate: number;
  gstAmount: number;
  lineTotal: number;
}

export interface PurchaseBill {
  id: string;
  billNumber: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseBillItem[];
  totalAmount: number;
  subTotal: number;
  paymentStatus: 'paid' | 'unpaid';
  billDate: string;
  notes: string;
  tenantId: string;
  gstBreakdown: {
    cgst: number;
    sgst: number;
    igst: number;
    totalGst: number;
  };
}

export interface ReminderLog {
  tenantId: string;
  gstMonth: number;
  gstYear: number;
  sentAt: Date;
  channel: 'whatsapp' | 'email';
  urgency: 'info' | 'warning' | 'urgent' | 'critical';
  status: 'sent' | 'failed';
  errorMessage?: string;
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

export interface AppNotification {
  id: string;
  tenantId: string;
  title: string;
  message: string;
  type: 'sale' | 'low_stock' | 'payment' | 'expense' | 'purchase' | 'customer' | 'general';
  read: boolean;
  createdAt: string;
}

export interface ReturnLog {
  id: string;
  creditNoteId: string;
  originalBillId: string;
  productId: string;
  productName: string;
  quantityReturned: number;
  returnReason: string;
  returnType: 'full_return' | 'partial_return' | 'exchange';
  returnDate: string;
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
  barcode: String,
  purchasePrice: { type: Number, default: 0 }
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
  loyaltyPoints: { type: Number, default: 0 },
  storeCredit: { type: Number, default: 0 }
});

const BillSchema = new Schema<Bill>({
  id: { type: String, required: true, unique: true },
  billNumber: { type: String, required: true },
  customerId: String,
  customerName: { type: String, default: 'Walk-in' },
  customerPhone: String,
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
  paymentStatus: { type: String, enum: ['paid', 'partial', 'unpaid', 'refunded'] },
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
  convertedToInvoice: Boolean,

  // Return / exchange fields (only populated when documentType === 'credit_note')
  returnType: {
    type: String,
    enum: ['full_return', 'partial_return', 'exchange', null],
    default: null
  },
  linkedBillNumber: { type: String, default: null },
  returnReason: {
    type: String,
    enum: ['damaged', 'wrong_item', 'customer_changed_mind', 'quality_issue', 'expired', 'other', null],
    default: null
  },
  returnReasonNote: { type: String, default: '' },
  exchangeItems: [
    {
      productId: String,
      productName: String,
      quantity: Number,
      price: Number,
      gstRate: Number,
      gstAmount: Number,
      lineTotal: Number
    }
  ],
  refundAmount: { type: Number, default: 0 },
  collectAmount: { type: Number, default: 0 },
  balanceType: {
    type: String,
    enum: ['refund_to_customer', 'collect_from_customer', 'even', null],
    default: null
  },
  refundMode: {
    type: String,
    enum: ['cash', 'upi', 'store_credit', 'bank_transfer', null],
    default: null
  },
  refundNote: { type: String, default: '' },
  processedBy: String
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
    purchasePrice: Number,
    gstRate: Number,
    gstAmount: Number,
    lineTotal: Number
  }],
  totalAmount: Number,
  subTotal: Number,
  paymentStatus: { type: String, enum: ['paid', 'unpaid'] },
  billDate: String,
  notes: String,
  tenantId: { type: String, required: true },
  gstBreakdown: {
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    totalGst: { type: Number, default: 0 }
  }
});

const ReminderLogSchema = new Schema<ReminderLog>({
  tenantId: { type: String, required: true, index: true },
  gstMonth: { type: Number },
  gstYear: { type: Number },
  sentAt: { type: Date, default: Date.now },
  channel: { type: String, enum: ['whatsapp', 'email'] },
  urgency: { type: String, enum: ['info', 'warning', 'urgent', 'critical'] },
  status: { type: String, enum: ['sent', 'failed'] },
  errorMessage: { type: String }
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

const NotificationSchema = new Schema<AppNotification>({
  id: { type: String, required: true, unique: true },
  tenantId: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, required: true, enum: ['sale', 'low_stock', 'payment', 'expense', 'purchase', 'customer', 'general'] },
  read: { type: Boolean, default: false },
  createdAt: { type: String, required: true }
});

const ReturnLogSchema = new Schema<ReturnLog>({
  id: { type: String, required: true, unique: true },
  creditNoteId: { type: String, required: true },
  originalBillId: { type: String, required: true },
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  quantityReturned: { type: Number, required: true },
  returnReason: { type: String, required: true },
  returnType: { type: String, required: true, enum: ['full_return', 'partial_return', 'exchange'] },
  returnDate: { type: String, required: true },
  tenantId: { type: String, required: true }
});

// Staff Interfaces
export interface Staff {
  name: string;
  phone: string;
  role: string;
  salaryType: 'monthly' | 'daily';
  monthlySalary: number;
  dailyWage: number;
  joiningDate: Date;
  status: 'active' | 'inactive';
  bankDetails?: {
    accountNumber?: string;
    ifsc?: string;
    upiId?: string;
  };
  tenantId: string;
  createdAt?: Date;
}

export interface Attendance {
  staffId: mongoose.Types.ObjectId | string;
  date: Date;
  status: 'present' | 'absent' | 'half_day' | 'paid_leave';
  markedBy?: string;
  note?: string;
  tenantId: string;
}

export interface Advance {
  staffId: mongoose.Types.ObjectId | string;
  amount: number;
  date: Date;
  note?: string;
  deductedInPayrollRun?: mongoose.Types.ObjectId | string | null;
  tenantId: string;
}

export interface PayrollEntry {
  staffId: mongoose.Types.ObjectId | string;
  staffName: string;
  role: string;
  salaryType: string;
  baseSalary: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  paidLeaveDays: number;
  totalWorkingDays: number;
  payableDays: number;
  grossSalary: number;
  advanceDeducted: number;
  netSalary: number;
  paymentMode: 'cash' | 'bank_transfer' | 'upi';
  paymentStatus: 'pending' | 'paid';
  slipSentAt?: Date | null;
}

export interface PayrollRun {
  month: number;
  year: number;
  runDate: Date;
  status: 'draft' | 'finalized';
  entries: PayrollEntry[];
  totalPayout: number;
  tenantId: string;
}

// Staff Schemas
const StaffSchema = new Schema<Staff>({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  role: { type: String, default: 'General Staff' },
  salaryType: { type: String, enum: ['monthly', 'daily'], default: 'monthly' },
  monthlySalary: { type: Number, default: 0 },
  dailyWage: { type: Number, default: 0 },
  joiningDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  bankDetails: {
    accountNumber: { type: String },
    ifsc: { type: String },
    upiId: { type: String }
  },
  tenantId: { type: String, required: true, index: true },
  createdAt: { type: Date, default: Date.now }
});

const AttendanceSchema = new Schema<Attendance>({
  staffId: { type: Schema.Types.ObjectId, ref: 'Staff', required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['present', 'absent', 'half_day', 'paid_leave'], required: true },
  markedBy: { type: String },
  note: { type: String, default: '' },
  tenantId: { type: String, required: true, index: true }
});

AttendanceSchema.index({ staffId: 1, date: 1, tenantId: 1 }, { unique: true });

const AdvanceSchema = new Schema<Advance>({
  staffId: { type: Schema.Types.ObjectId, ref: 'Staff', required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  note: { type: String, default: '' },
  deductedInPayrollRun: { type: Schema.Types.ObjectId, ref: 'PayrollRun', default: null },
  tenantId: { type: String, required: true, index: true }
});

const PayrollRunSchema = new Schema<PayrollRun>({
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  runDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['draft', 'finalized'], default: 'draft' },
  entries: [
    {
      staffId: { type: Schema.Types.ObjectId, ref: 'Staff' },
      staffName: { type: String },
      role: { type: String },
      salaryType: { type: String },
      baseSalary: { type: Number },
      presentDays: { type: Number },
      absentDays: { type: Number },
      halfDays: { type: Number },
      paidLeaveDays: { type: Number },
      totalWorkingDays: { type: Number },
      payableDays: { type: Number },
      grossSalary: { type: Number },
      advanceDeducted: { type: Number, default: 0 },
      netSalary: { type: Number },
      paymentMode: { type: String, enum: ['cash', 'bank_transfer', 'upi'], default: 'cash' },
      paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
      slipSentAt: { type: Date, default: null }
    }
  ],
  totalPayout: { type: Number },
  tenantId: { type: String, required: true, index: true }
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
export const ReminderLogModel = model('ReminderLog', ReminderLogSchema);
export const NotificationModel = model('Notification', NotificationSchema);
export const ReturnLogModel = model('ReturnLog', ReturnLogSchema);
export const StaffModel = model('Staff', StaffSchema);
export const AttendanceModel = model('Attendance', AttendanceSchema);
export const AdvanceModel = model('Advance', AdvanceSchema);
export const PayrollRunModel = model('PayrollRun', PayrollRunSchema);

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
