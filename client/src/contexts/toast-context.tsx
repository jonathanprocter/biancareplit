import * as React from 'react';
import * as ToastPrimitives from '@radix-ui/react-toast';
import type { ToastContextType, ToasterToast } from '../types/toast';

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToasterToast[]>([]);

  const dismiss = React.useCallback((toastId: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== toastId));
  }, []);

  const toast = React.useCallback((props: Omit<ToasterToast, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 9);
    const newToast = { id, ...props };

    setToasts((prev) => [...prev, newToast]);
    if (props.duration !== Infinity) {
      setTimeout(() => dismiss(id), props.duration || 5000);
    }
  }, [dismiss]);

  const contextValue = React.useMemo(
    () => ({ toasts, toast, dismiss }),
    [toasts, toast, dismiss]
  );

  return (
    <ToastPrimitives.Provider swipeDirection="right">
      <ToastContext.Provider value={contextValue}>
        {children}
      </ToastContext.Provider>
      <ToastPrimitives.Viewport className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]" />
    </ToastPrimitives.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = React.useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export { ToastContext };