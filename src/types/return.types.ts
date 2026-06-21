import { BillItem } from '../types';

export type ReturnType = 'full_return' | 'partial_return' | 'exchange';

export type ReturnReason = 'damaged' | 'wrong_item' | 'customer_changed_mind' | 'quality_issue' | 'expired' | 'other';

export interface ReturnLog {
  id: string;
  creditNoteId: string;
  originalBillId: string;
  productId: string;
  productName: string;
  quantityReturned: number;
  returnReason: string;
  returnType: ReturnType;
  returnDate: string;
  tenantId: string;
}

export interface ReturnAnalytics {
  period: string;
  topReturnedProducts: {
    productId: string;
    productName: string;
    totalSold: number;
    totalReturned: number;
    returnRate: string;
    risk: 'high' | 'medium' | 'low';
    topReason: ReturnReason;
  }[];
  reasonsBreakdown: {
    damaged: number;
    quality_issue: number;
    wrong_item: number;
    customer_changed_mind: number;
    expired: number;
    other: number;
  };
  totalRefundsIssued: number;
  totalReturnsCount: number;
}
