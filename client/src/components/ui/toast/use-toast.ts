
import { toast } from 'sonner';

interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

export function useToast() {
  const showToast = ({ title, description, variant, duration }: ToastProps) => {
    const toastFn = variant === 'destructive' ? toast.error : toast;
    toastFn(description || title, {
      description: description ? title : undefined,
      duration: duration || 3000,
    });
  };

  return { toast: showToast };
}

export { toast };
