import * as React from 'react';
import { ToastProvider as RadixToastProvider } from '@/components/ui/toast';
import type { ToastContextType, ToasterToast } from '@/types/toast';

const ToastContext = React.createContext<ToastContextType | null>(null);

export function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = React.useState<ToasterToast[]>([]);

  const dismiss = React.useCallback((toastId: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== toastId));
  }, []);

  const toast = React.useCallback((props: Omit<ToasterToast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);

    setToasts((prev) => [...prev, { id, ...props }]);

    if (props.duration !== Infinity) {
      setTimeout(() => {
        dismiss(id);
      }, props.duration || 5000);
    }
  }, [dismiss]);

  const contextValue = React.useMemo(
    () => ({
      toasts,
      toast,
      dismiss,
    }),
    [toasts, toast, dismiss]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      <RadixToastProvider swipeDirection="right">
        {children}
      </RadixToastProvider>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = React.useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
}