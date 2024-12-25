import { ToastProvider as ToastPrimitiveProvider } from '@radix-ui/react-toast';
import { createContext, useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import type { ToastContextType, ToasterToast } from '../types/toast';

export const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToasterToast[]>([]);

  const dismiss = useCallback((toastId: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== toastId));
  }, []);

  const toast = useCallback((props: Omit<ToasterToast, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 9);
    const newToast = { id, ...props };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => dismiss(id), 5000);
  }, [dismiss]);

  return (
    <ToastPrimitiveProvider swipeDirection="right">
      <ToastContext.Provider value={{ toasts, toast, dismiss }}>
        {children}
      </ToastContext.Provider>
    </ToastPrimitiveProvider>
  );
}