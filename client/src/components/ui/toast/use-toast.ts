
import { toast } from 'sonner';

export interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  const showToast = (props: ToastProps) => {
    if (props.variant === 'destructive') {
      toast.error(props.title, { description: props.description });
    } else {
      toast(props.title, { description: props.description });
    }
  };

  return { toast: showToast };
}
