import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user: User | null;
  tenant: any | null;
  token: string | null;
  setAuth: (user: User | null, token: string | null, tenant?: any | null) => void;
  updateTenant: (tenant: any) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  tenant: JSON.parse(localStorage.getItem('tenant') || 'null'),
  token: localStorage.getItem('token'),
  setAuth: (user, token, tenant) => {
    if (token) {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      if (tenant) localStorage.setItem('tenant', JSON.stringify(tenant));
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('tenant');
    }
    set({ user, token, tenant: tenant || JSON.parse(localStorage.getItem('tenant') || 'null') });
  },
  updateTenant: (tenant) => {
    if (tenant) {
      localStorage.setItem('tenant', JSON.stringify(tenant));
    } else {
      localStorage.removeItem('tenant');
    }
    set({ tenant });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tenant');
    set({ user: null, token: null, tenant: null });
  },
}));
