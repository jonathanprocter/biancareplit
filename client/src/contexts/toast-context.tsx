import * as React from 'react';
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast';

type ToasterToast = {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  variant?: 'default' | 'destructive';
};

type ToastContextType = {
  toasts: ToasterToast[];
  addToast: (toast: Omit<ToasterToast, 'id'>) => void;
  removeToast: (id: string) => void;
};

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToasterToast[]>([]);

  const addToast = React.useCallback((toast: Omit<ToasterToast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const value = React.useMemo(
    () => ({
      toasts,
      addToast,
      removeToast,
    }),
    [toasts, addToast, removeToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastProvider swipeDirection="right">
        {toasts.map(({ id, title, description, action, ...props }) => (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        ))}
        <ToastViewport />
      </ToastProvider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
