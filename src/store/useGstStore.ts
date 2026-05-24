import { create } from 'zustand';
import api from '../lib/api';
import { GstSummary } from '../types/gst.types';
import axios from 'axios';

interface GstStore {
  summary: GstSummary | null;
  loading: boolean;
  selectedMonth: number;
  selectedYear: number;
  setMonth: (month: number, year: number) => void;
  fetchSummary: () => Promise<void>;
  exportPdf: () => Promise<void>;
  sendEmail: () => Promise<void>;
}

export const useGstStore = create<GstStore>((set, get) => ({
  summary: null,
  loading: false,
  selectedMonth: new Date().getMonth() + 1,
  selectedYear: new Date().getFullYear(),

  setMonth: (month, year) => {
    set({ selectedMonth: month, selectedYear: year });
    get().fetchSummary();
  },

  fetchSummary: async () => {
    const { selectedMonth, selectedYear } = get();
    set({ loading: true });
    try {
      const { data } = await api.get('/gst/summary', {
        params: { month: selectedMonth, year: selectedYear }
      });
      set({ summary: data });
    } catch (err) {
      console.error('Failed to fetch GST summary:', err);
    } finally {
      set({ loading: false });
    }
  },

  exportPdf: async () => {
    const { selectedMonth, selectedYear, summary } = get();
    if (!summary) return;
    
    try {
      const response = await api.get('/gst/export-pdf', {
        params: { month: selectedMonth, year: selectedYear },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `GSTR3B-${summary.period.label.replace(' ', '')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Failed to export PDF');
    }
  },

  sendEmail: async () => {
    const { selectedMonth, selectedYear } = get();
    try {
      await api.post('/gst/send-email', { month: selectedMonth, year: selectedYear });
      alert('Email sent successfully');
    } catch (err) {
      console.error('Email failed:', err);
      alert('Failed to send email');
    }
  }
}));
