import { create } from 'zustand';
import api from '../lib/api';
import { PayrollRun, PayrollPreview } from '../types/staff.types';

interface PayrollState {
  history: PayrollRun[];
  currentRun: PayrollRun | null;
  activePreview: PayrollPreview | null;
  loading: boolean;
  error: string | null;
  fetchHistory: () => Promise<void>;
  fetchPayrollRun: (id: string) => Promise<PayrollRun>;
  calculatePreview: (month: number, year: number) => Promise<PayrollPreview>;
  finalizePayroll: (month: number, year: number) => Promise<PayrollRun>;
  markPaid: (runId: string, staffId: string, paymentMode: 'cash' | 'bank_transfer' | 'upi') => Promise<void>;
  sendWhatsAppSlip: (runId: string, staffId: string) => Promise<{ whatsappLink: string }>;
  sendAllWhatsAppSlips: (runId: string) => Promise<{ success: boolean; links: any[] }>;
}

export const usePayrollStore = create<PayrollState>((set, get) => ({
  history: [],
  currentRun: null,
  activePreview: null,
  loading: false,
  error: null,

  fetchHistory: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/staff/payroll/history');
      set({ history: response.data, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch payroll history', loading: false });
    }
  },

  fetchPayrollRun: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await api.get(`/staff/payroll/${id}`);
      set({ currentRun: response.data, loading: false });
      return response.data;
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch payroll details', loading: false });
      throw err;
    }
  },

  calculatePreview: async (month, year) => {
    set({ loading: true, error: null, activePreview: null });
    try {
      const response = await api.post('/staff/payroll/preview', null, { params: { month, year } });
      set({ activePreview: response.data, loading: false });
      return response.data;
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to generate payroll preview', loading: false });
      throw err;
    }
  },

  finalizePayroll: async (month, year) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/staff/payroll/run', { month, year });
      set({ currentRun: response.data, loading: false });
      get().fetchHistory(); // Refresh historical logs automatically
      return response.data;
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to finalize payroll run', loading: false });
      throw err;
    }
  },

  markPaid: async (runId, staffId, paymentMode) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post(`/staff/payroll/${runId}/mark-paid`, { staffId, paymentMode });
      // Update local state is crucial to reflect payment status instantly
      if (get().currentRun && get().currentRun?._id === runId) {
        set({ currentRun: response.data.run });
      }
      set({ loading: false });
      get().fetchHistory();
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to record salary payment', loading: false });
      throw err;
    }
  },

  sendWhatsAppSlip: async (runId, staffId) => {
    try {
      const response = await api.post(`/staff/payroll/${runId}/send-slip/${staffId}`);
      // Update local state sent date
      if (get().currentRun && get().currentRun?._id === runId) {
        const updatedEntries = get().currentRun!.entries.map(e => 
          e.staffId === staffId ? { ...e, slipSentAt: new Date().toISOString() } : e
        );
        set({ currentRun: { ...get().currentRun!, entries: updatedEntries } });
      }
      return response.data;
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to generate WhatsApp salary slip' });
      throw err;
    }
  },

  sendAllWhatsAppSlips: async (runId) => {
    try {
      const response = await api.post(`/staff/payroll/${runId}/send-all-slips`);
      // Update all entries sent dates on Success
      if (get().currentRun && get().currentRun?._id === runId) {
        const updatedEntries = get().currentRun!.entries.map(e => ({
          ...e,
          slipSentAt: new Date().toISOString()
        }));
        set({ currentRun: { ...get().currentRun!, entries: updatedEntries } });
      }
      return response.data;
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to batch send salary slips' });
      throw err;
    }
  }
}));
