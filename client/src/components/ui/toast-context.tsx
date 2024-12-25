import * as React from 'react';

import type { Toast, ToastContextValue } from './use-toast';
import { ToastContext } from './use-toast';

const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 5000;

export function ToastContextProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = React.useCallback((toast: Omit<Toast, 'id'>) => {
    setToasts((currentToasts) => {
      const id = Math.random().toString(36).substring(2);
      const newToast = { ...toast, id };

      setTimeout(() => {
        setToasts((currentToasts) => currentToasts.filter((t) => t.id !== id));
      }, TOAST_REMOVE_DELAY);

      return [newToast, ...currentToasts].slice(0, TOAST_LIMIT);
    });
  }, []);

  const dismissToast = React.useCallback((toastId: string) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== toastId));
  }, []);

  const value = React.useMemo(
    () => ({
      toasts,
      addToast,
      dismissToast,
    }),
    [toasts, addToast, dismissToast],
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}
