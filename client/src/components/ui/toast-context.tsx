'use client';

import { createContext, useContext } from 'react';
import type { Toast, ToasterToast } from '@/components/ui/toast';

type ToastContextType = {
  toasts: ToasterToast[];
  addToast: (toast: Toast) => void;
  removeToast: (id: string) => void;
  updateToast: (id: string, toast: Partial<Toast>) => void;
};

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToastContext() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
}