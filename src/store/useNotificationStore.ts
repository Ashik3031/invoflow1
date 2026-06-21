import { create } from 'zustand';
import api from '../lib/api';

export interface AppNotification {
  id: string;
  tenantId: string;
  title: string;
  message: string;
  type: 'sale' | 'low_stock' | 'payment' | 'expense' | 'purchase' | 'customer' | 'general';
  read: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: AppNotification[];
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
}

export function playNotificationSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Tone 1: Dynamic warm chime
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    gain1.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
    
    osc1.start(audioCtx.currentTime);
    osc1.stop(audioCtx.currentTime + 0.35);
    
    // Tone 2: Harmonious high note
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, audioCtx.currentTime + 0.08); // A5
    gain2.gain.setValueAtTime(0.12, audioCtx.currentTime + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
    
    osc2.start(audioCtx.currentTime + 0.08);
    osc2.stop(audioCtx.currentTime + 0.45);
  } catch (e) {
    console.error('Failed to play notification sound:', e);
  }
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  loading: false,
  fetchNotifications: async () => {
    try {
      const res = await api.get('/notifications/list');
      const newNotifications = Array.isArray(res.data) ? res.data : [];
      
      const currentNotifications = Array.isArray(get().notifications) ? get().notifications : [];
      if (currentNotifications.length > 0 && newNotifications.length > 0) {
        // Detect if there is a new unread notification that we didn't have before
        const currentIds = new Set(currentNotifications.map((n) => n.id));
        const hasNew = newNotifications.some((n: AppNotification) => !currentIds.has(n.id) && !n.read);
        if (hasNew) {
          playNotificationSound();
        }
      }
      
      set({ notifications: newNotifications });
    } catch (err) {
      console.warn('Notification fetch warning (expected during server startup):', err);
    }
  },
  markAsRead: async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      set({
        notifications: get().notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
      });
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  },
  markAllAsRead: async () => {
    try {
      await api.put('/notifications/read-all');
      set({
        notifications: get().notifications.map((n) => ({ ...n, read: true })),
      });
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  },
  clearAll: async () => {
    try {
      await api.delete('/notifications/clear-all');
      set({ notifications: [] });
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  }
}));
