
import { toast } from 'sonner';

export interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  return {
    toast: (props: ToastProps) => {
      const { title, description, variant } = props;
      if (variant === 'destructive') {
        toast.error(title, { description });
      } else {
        toast.message(title, { description });
      }
    }
  };
}
