import type { ReactNode } from 'react';

export interface Toast {
  id: string;
  title?: ReactNode;
  description?: ReactNode;
  variant?: 'default' | 'destructive';
}

export interface ToastProps extends Toast {
  onDismiss?: () => void;
}
