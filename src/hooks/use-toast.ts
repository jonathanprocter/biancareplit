
import { create } from 'zustand';

type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  message: string | null;
  type: ToastType;
  title?: string;
  description?: string;
  isVisible: boolean;
  show: (options: { title?: string; description?: string; type?: ToastType }) => void;
  hide: () => void;
}

export const useToast = create<ToastState>((set) => ({
  message: null,
  type: 'info',
  title: undefined,
  description: undefined,
  isVisible: false,
  show: (options) => set({ 
    message: options.description || options.title,
    type: options.type || 'info',
    title: options.title,
    description: options.description,
    isVisible: true
  }),
  hide: () => set({ 
    message: null, 
    type: 'info', 
    title: undefined, 
    description: undefined,
    isVisible: false 
  }),
}));

export const toast = {
  success: (title: string, description?: string) => useToast.getState().show({ title, description, type: 'success' }),
  error: (title: string, description?: string) => useToast.getState().show({ title, description, type: 'error' }),
  info: (title: string, description?: string) => useToast.getState().show({ title, description, type: 'info' })
};
