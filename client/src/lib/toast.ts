
import { create } from 'zustand';

interface ToastState {
  message: string | null;
  variant?: 'default' | 'destructive';
  title?: string;
  description?: string;
}

interface ToastStore extends ToastState {
  showToast: (toast: ToastState) => void;
  hideToast: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  message: null,
  showToast: (toast) => {
    set(toast);
    setTimeout(() => {
      set({ message: null });
    }, 3000);
  },
  hideToast: () => set({ message: null }),
}));
