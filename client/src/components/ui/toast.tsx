import * as ToastPrimitives from '@radix-ui/react-toast';
import { type VariantProps, cva } from 'class-variance-authority';
import { X } from 'lucide-react';
import * as React from 'react';
import { cn } from '../../lib/utils';

const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all',
  {
    variants: {
      variant: {
        default: 'border bg-background text-foreground',
        destructive: 'border-red-500 bg-red-500 text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

interface Toast {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  variant?: VariantProps<typeof toastVariants>['variant'];
}

type ToasterToast = Toast;

const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 5000;

type ToasterType = {
  toasts: ToasterToast[];
  toast: (data: Omit<Toast, "id">) => void;
  dismiss: (toastId?: string) => void;
};

const ToasterContext = React.createContext<ToasterType>({
  toasts: [],
  toast: () => {},
  dismiss: () => {},
});

export function useToast() {
  const context = React.useContext(ToasterContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToasterToast[]>([]);

  const toast = React.useCallback((data: Omit<Toast, "id">) => {
    setToasts((currentToasts) => {
      const id = Math.random().toString(36).slice(2);
      const newToast = { ...data, id };

      if (currentToasts.length >= TOAST_LIMIT) {
        currentToasts.pop();
      }

      setTimeout(() => {
        setToasts((toasts) => toasts.filter((t) => t.id !== id));
      }, TOAST_REMOVE_DELAY);

      return [newToast, ...currentToasts];
    });
  }, []);

  const dismiss = React.useCallback((toastId?: string) => {
    setToasts((currentToasts) => {
      if (toastId) {
        return currentToasts.filter((toast) => toast.id !== toastId);
      }
      return [];
    });
  }, []);

  return (
    <ToasterContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
    </ToasterContext.Provider>
  );
}

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastPrimitives.Provider swipeDirection="right">
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
      <ToastPrimitives.Viewport className="fixed bottom-0 right-0 top-auto z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]" />
    </ToastPrimitives.Provider>
  );
}

export function Toast({
  className,
  variant,
  ...props
}: React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & VariantProps<typeof toastVariants>) {
  return (
    <ToastPrimitives.Root
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  );
}

export function ToastTitle({ className, ...props }: React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>) {
  return <ToastPrimitives.Title className={cn("text-sm font-semibold", className)} {...props} />;
}

export function ToastDescription({ className, ...props }: React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>) {
  return <ToastPrimitives.Description className={cn("text-sm opacity-90", className)} {...props} />;
}

export function ToastClose({ className, ...props }: React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>) {
  return (
    <ToastPrimitives.Close
      className={cn(
        "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100",
        className
      )}
      toast-close=""
      {...props}
    >
      <X className="h-4 w-4" />
    </ToastPrimitives.Close>
  );
}

export type { Toast };