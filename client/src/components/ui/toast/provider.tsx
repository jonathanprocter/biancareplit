import * as ToastPrimitives from '@radix-ui/react-toast';
import * as React from 'react';
import type { Toast } from './types';

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (toastId: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = React.useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2);
    setToasts((prev) => [...prev, { ...toast, id }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismissToast = React.useCallback((toastId: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== toastId));
  }, []);

  const contextValue = React.useMemo(
    () => ({
      toasts,
      addToast,
      dismissToast,
    }),
    [toasts, addToast, dismissToast],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      <ToastPrimitives.Provider>
        {children}
        <ToastPrimitives.Viewport className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:max-w-[420px]" />
      </ToastPrimitives.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return {
    toast: context.addToast,
    dismiss: context.dismissToast,
    toasts: context.toasts,
  };
}