import type { ToastProps } from '@radix-ui/react-toast';

import type { ReactNode } from 'react';

export type ToasterToast = ToastProps & {
  id: string;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
};

export interface ToastContextType {
  toasts: ToasterToast[];
  toast: (props: Omit<ToasterToast, 'id'>) => void;
  dismiss: (toastId: string) => void;
}
