import { type ReactNode, createContext, useCallback, useState } from 'react';

import type { ToastProps } from '../components/ui/toast';

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

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToasterToast[]>([]);

  const dismiss = useCallback((toastId: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== toastId));
  }, []);

  const toast = useCallback(
    (props: Omit<ToasterToast, 'id'>) => {
      const id = Math.random().toString(36).slice(2, 9);
      const newToast = { id, ...props };
      setToasts((prev) => [...prev, newToast]);
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  const value = {
    toasts,
    toast,
    dismiss,
  };

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}
