import { ToastProvider as BaseToastProvider } from '@radix-ui/react-toast';

import * as React from 'react';

import type { Toast } from './toast';

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return <BaseToastProvider>{children}</BaseToastProvider>;
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return {
    toasts: context.toasts,
    toast: context.addToast,
    dismiss: context.removeToast,
  };
}