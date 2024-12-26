
import { toast } from 'sonner';

export interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  return {
    toast: (props: ToastProps) => {
      try {
        const { title, description, variant } = props;
        if (variant === 'destructive') {
          toast.error(title, { description });
        } else {
          toast(title, { description });
        }
      } catch (err) {
        console.error('Toast error:', err);
      }
    }
  };
}
