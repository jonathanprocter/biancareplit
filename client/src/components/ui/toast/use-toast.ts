
import { Toaster as Sonner, toast } from 'sonner';

interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

export function useToast() {
  const showToast = ({ title, description, variant = 'default', duration = 3000 }: ToastProps) => {
    if (variant === 'destructive') {
      toast.error(title, { description });
    } else {
      toast(title, { description });
    }
  };

  return {
    toast: showToast,
  };
}

export { Sonner as Toaster };
