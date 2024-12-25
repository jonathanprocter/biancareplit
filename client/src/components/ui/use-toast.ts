import * as React from 'react';

import type { ToastActionElement } from './toast';

export interface Toast {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  variant?: 'default' | 'destructive';
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (toastId: string) => void;
}

export const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return {
    ...context,
    toast: context.addToast,
    dismiss: context.dismissToast,
  };
}

export type { ToastContextValue };
