import React, { createContext, useCallback, useState } from 'react';

import { ToastProps } from './types';

interface ToastContextType {
  toast: (props: ToastProps) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const toast = useCallback((props: ToastProps) => {
    setToasts((prevToasts) => [...prevToasts, props]);
  }, []);

  return <ToastContext.Provider value={{ toast }}>{children}</ToastContext.Provider>;
};