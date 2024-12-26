
import { toast } from 'sonner';

export interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  return {
    toast: (props: ToastProps) => {
      if (props.variant === 'destructive') {
        toast.error(props.title, { description: props.description });
      } else {
        toast.success(props.title, { description: props.description });
      }
    }
  };
}
