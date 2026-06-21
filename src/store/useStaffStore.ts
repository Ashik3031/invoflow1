import { create } from 'zustand';
import api from '../lib/api';
import { Staff, Attendance, Advance } from '../types/staff.types';

interface StaffState {
  staffList: Staff[];
  todayAttendance: Attendance[];
  loading: boolean;
  error: string | null;
  fetchStaff: (status?: string) => Promise<void>;
  createStaff: (staffData: Partial<Staff>) => Promise<Staff>;
  updateStaff: (id: string, staffData: Partial<Staff>) => Promise<Staff>;
  deleteStaff: (id: string) => Promise<void>;
  markAttendance: (payload: { staffId: string; date: string; status: Attendance['status']; note?: string }) => Promise<void>;
  bulkMarkAttendance: (date: string, records: { staffId: string; status: Attendance['status'] }[]) => Promise<void>;
  fetchTodayAttendance: () => Promise<void>;
  fetchStaffAttendance: (staffId: string, month: number, year: number) => Promise<Attendance[]>;
  giveAdvance: (payload: { staffId: string; amount: number; date?: string; note?: string }) => Promise<{ advance: Advance; runningBalance: number }>;
  fetchAdvances: (staffId?: string, settled?: boolean) => Promise<Advance[]>;
}

export const useStaffStore = create<StaffState>((set, get) => ({
  staffList: [],
  todayAttendance: [],
  loading: false,
  error: null,

  fetchStaff: async (status) => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/staff/list', { params: status ? { status } : {} });
      set({ staffList: response.data, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch staff', loading: false });
    }
  },

  createStaff: async (staffData) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/staff/create', staffData);
      set((state) => ({ 
        staffList: [...state.staffList, response.data],
        loading: false 
      }));
      return response.data;
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to create staff', loading: false });
      throw err;
    }
  },

  updateStaff: async (id, staffData) => {
    set({ loading: true, error: null });
    try {
      const response = await api.put(`/staff/${id}`, staffData);
      set((state) => ({
        staffList: state.staffList.map((s) => (s._id === id ? response.data : s)),
        loading: false
      }));
      return response.data;
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to update staff', loading: false });
      throw err;
    }
  },

  deleteStaff: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/staff/${id}`);
      set((state) => ({
        staffList: state.staffList.map((s) => (s._id === id ? { ...s, status: 'inactive' } : s)),
        loading: false
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to deactivate staff', loading: false });
      throw err;
    }
  },

  markAttendance: async (payload) => {
    set({ error: null });
    try {
      await api.post('/staff/attendance/mark', payload);
      // Refresh today's attendance if marking for today
      const todayStr = new Date().toISOString().split('T')[0];
      if (payload.date === todayStr) {
        get().fetchTodayAttendance();
      }
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to mark attendance' });
      throw err;
    }
  },

  bulkMarkAttendance: async (date, records) => {
    set({ loading: true, error: null });
    try {
      await api.post('/staff/attendance/bulk-mark', { date, records });
      set({ loading: false });
      
      const todayStr = new Date().toISOString().split('T')[0];
      if (date === todayStr) {
        get().fetchTodayAttendance();
      }
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to save bulk attendance', loading: false });
      throw err;
    }
  },

  fetchTodayAttendance: async () => {
    try {
      const response = await api.get('/staff/attendance/today');
      set({ todayAttendance: response.data });
    } catch (err: any) {
      console.warn('Failed to fetch today attendance', err);
    }
  },

  fetchStaffAttendance: async (staffId, month, year) => {
    try {
      const response = await api.get(`/staff/attendance/${staffId}`, { params: { month, year } });
      return response.data;
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch attendance calendar' });
      return [];
    }
  },

  giveAdvance: async (payload) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/staff/advance/give', payload);
      set({ loading: false });
      return response.data;
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to record advance payment', loading: false });
      throw err;
    }
  },

  fetchAdvances: async (staffId, settled) => {
    try {
      const params: any = {};
      if (staffId) params.staffId = staffId;
      if (settled !== undefined) params.settled = settled ? 'true' : 'false';
      
      const response = await api.get('/staff/advance/list', { params });
      return response.data;
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to load advances' });
      return [];
    }
  }
}));
