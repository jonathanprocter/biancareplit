
import { toast } from 'sonner';

interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

export function useToast() {
  return {
    toast: ({ title, description, variant = 'default', duration = 3000 }: ToastProps) => {
      if (variant === 'destructive') {
        toast.error(title, { description });
      } else {
        toast(title, { description });
      }
    }
  };
}
