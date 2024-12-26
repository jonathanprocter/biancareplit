
import { create } from 'zustand';

interface ToastState {
  message: string | null;
  type: 'success' | 'error' | 'info';
  title?: string;
  description?: string;
  show: (options: { title?: string; description?: string; type?: 'success' | 'error' | 'info' }) => void;
  hide: () => void;
}

export const useToast = create<ToastState>((set) => ({
  message: null,
  type: 'info',
  title: undefined,
  description: undefined,
  show: (options) => set({ 
    message: options.description || options.title, 
    type: options.type || 'info',
    title: options.title,
    description: options.description
  }),
  hide: () => set({ message: null, type: 'info', title: undefined, description: undefined }),
}));
