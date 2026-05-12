import express from 'express';
import { 
  BillModel, 
  ProductModel, 
  CustomerModel, 
  SupplierModel, 
  PurchaseBillModel, 
  ExpenseModel, 
  CashBookModel, 
  BankAccountModel, 
  BankTransactionModel, 
  PaymentModel, 
  LoyaltyConfigModel, 
  CouponModel 
} from '../db.js';
import { AuthRequest } from '../middleware/auth.js';

const router = express.Router();

router.get('/export', async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;

  const backupData = {
    exportedAt: new Date().toISOString(),
    tenantId,
    version: '1.0',
    data: {
      bills: await BillModel.find({ tenantId }),
      products: await ProductModel.find({ tenantId }),
      customers: await CustomerModel.find({ tenantId }),
      suppliers: await SupplierModel.find({ tenantId }),
      purchaseBills: await PurchaseBillModel.find({ tenantId }),
      expenses: await ExpenseModel.find({ tenantId }),
      cashBook: await CashBookModel.find({ tenantId }),
      bankAccounts: await BankAccountModel.find({ tenantId }),
      bankTransactions: await BankTransactionModel.find({ tenantId }),
      payments: await PaymentModel.find({ tenantId }),
      loyaltyConfigs: await LoyaltyConfigModel.find({ tenantId }),
      coupons: await CouponModel.find({ tenantId })
    }
  };

  res.setHeader('Content-Disposition', `attachment; filename=backup_${tenantId}_${new Date().toISOString().split('T')[0]}.json`);
  res.json(backupData);
});

router.post('/restore', async (req: AuthRequest, res) => {
  const { tenantId: backupTenantId, data, version } = req.body;
  const currentTenantId = req.user!.tenantId;

  if (version !== '1.0') return res.status(400).json({ message: 'Invalid backup version' });
  if (backupTenantId !== currentTenantId) return res.status(403).json({ message: 'Backup belongs to another tenant' });

  const modelMap: Record<string, any> = {
    bills: BillModel,
    products: ProductModel,
    customers: CustomerModel,
    suppliers: SupplierModel,
    purchaseBills: PurchaseBillModel,
    expenses: ExpenseModel,
    cashBook: CashBookModel,
    bankAccounts: BankAccountModel,
    bankTransactions: BankTransactionModel,
    payments: PaymentModel,
    loyaltyConfigs: LoyaltyConfigModel,
    coupons: CouponModel
  };

  const summary: any = {};
  for (const [key, Model] of Object.entries(modelMap)) {
    if (data[key] && Array.isArray(data[key])) {
      // 1. Delete existing
      await Model.deleteMany({ tenantId: currentTenantId });
      // 2. Insert from backup
      const toAdd = data[key].map((item: any) => ({ ...item, tenantId: currentTenantId }));
      if (toAdd.length > 0) {
        await Model.insertMany(toAdd);
      }
      summary[key] = toAdd.length;
    }
  }

  res.json({ restored: summary });
});

export default router;
