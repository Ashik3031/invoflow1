import { create } from 'zustand';
import api from '../lib/api';
import { Bill } from '../types';
import { ReturnAnalytics } from '../types/return.types';

interface ReturnState {
  returnsList: Bill[];
  analytics: ReturnAnalytics | null;
  selectedInvoice: Bill | null;
  loading: boolean;
  error: string | null;
  fetchReturns: () => Promise<void>;
  fetchAnalytics: () => Promise<void>;
  retrieveInvoiceByNumber: (billNumber: string) => Promise<Bill>;
  selectInvoice: (bill: Bill | null) => void;
  createReturn: (payload: {
    originalBillId: string;
    returnType: 'full_return' | 'partial_return' | 'exchange';
    returnReason: string;
    returnReasonNote?: string;
    returnItems: { productId: string; quantity: number }[];
    exchangeItems?: { productId: string; quantity: number }[];
    refundMode?: 'cash' | 'upi' | 'store_credit' | 'bank_transfer';
    refundNote?: string;
  }) => Promise<any>;
}

export const useReturnStore = create<ReturnState>((set) => ({
  returnsList: [],
  analytics: null,
  selectedInvoice: null,
  loading: false,
  error: null,

  fetchReturns: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/billing/returns/list');
      set({ returnsList: response.data, loading: false });
    } catch (err: any) {
      set({ 
        error: err.response?.data?.message || 'Failed to fetch returns history', 
        loading: false 
      });
    }
  },

  fetchAnalytics: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/billing/returns/analytics');
      set({ analytics: response.data, loading: false });
    } catch (err: any) {
      set({ 
        error: err.response?.data?.message || 'Failed to fetch returns analytics', 
        loading: false 
      });
    }
  },

  retrieveInvoiceByNumber: async (billNumber: string) => {
    set({ loading: true, error: null });
    try {
      // Find within all billing invoices
      const response = await api.get('/billing/list');
      const invoices: Bill[] = response.data;
      const invoice = invoices.find(
        (inv) => 
          inv.billNumber.toLowerCase() === billNumber.toLowerCase() && 
          inv.documentType === 'invoice'
      );
      
      if (!invoice) {
        throw new Error(`Invoice ${billNumber} not found`);
      }
      
      set({ selectedInvoice: invoice, loading: false });
      return invoice;
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Invoice not found';
      set({ error: errMsg, loading: false });
      throw new Error(errMsg);
    }
  },

  selectInvoice: (bill) => {
    set({ selectedInvoice: bill, error: null });
  },

  createReturn: async (payload) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/billing/returns/create', payload);
      set({ loading: false });
      return response.data;
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to process return request';
      set({ error: errMsg, loading: false });
      throw new Error(errMsg);
    }
  }
}));
