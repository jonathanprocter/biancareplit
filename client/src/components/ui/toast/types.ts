import type { ReactNode } from 'react';

export interface Toast {
  id: string;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  variant?: 'default' | 'destructive';
}

export interface ToastProps extends Toast {
  className?: string;
}

export type ToastActionElement = React.ReactElement;

export interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (toastId: string) => void;
}