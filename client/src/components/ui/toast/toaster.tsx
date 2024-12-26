import { useEffect } from 'react';
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from './toast';
import { useToast } from './use-toast';

export function Toaster() {
  const { toasts, remove } = useToast();

  useEffect(() => {
    toasts.forEach((toast) => {
      if (toast.duration) {
        const timer = setTimeout(() => {
          remove(toast.id);
        }, toast.duration);

        return () => clearTimeout(timer);
      }
    });
  }, [toasts, remove]);

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, type }) => (
        <Toast key={id} className={type === 'error' ? 'bg-destructive text-destructive-foreground' : undefined}>
          <div className="grid gap-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          <ToastClose onClick={() => remove(id)} />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}