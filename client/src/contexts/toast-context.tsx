import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import type { ToastActionElement, ToastProps } from '@/components/ui/toast';

const TOAST_REMOVE_DELAY = 5000;

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

type ToasterContext = {
  toasts: ToasterToast[];
  addToast: (props: Omit<ToasterToast, 'id'>) => void;
  removeToast: (id: string) => void;
};

export const ToastContext = createContext<ToasterContext | undefined>(undefined);

export function ToastContextProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToasterToast[]>([]);

  const addToast = useCallback(({ ...props }: Omit<ToasterToast, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, ...props }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, TOAST_REMOVE_DELAY);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      toasts,
      addToast,
      removeToast,
    }),
    [toasts, addToast, removeToast],
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastContextProvider');
  }

  return {
    ...context,
    toast: context.addToast,
  };
}

// For backward compatibility
export const ToastProvider = ToastContextProvider;
