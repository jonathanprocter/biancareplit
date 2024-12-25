import { type ReactNode, createContext, useCallback, useContext, useState } from 'react';
import type { ToasterToast, ToastContextType } from '../types/toast';

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

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);

  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
}