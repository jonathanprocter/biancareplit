import { toast as sonnerToast } from 'sonner';

export interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success' | 'error' | 'info';
}

export const useToast = () => {
  const toast = (props: ToastProps) => {
    const message = props.description || props.title;
    switch (props.variant) {
      case 'success':
        sonnerToast.success(message);
        break;
      case 'error':
      case 'destructive':
        sonnerToast.error(message);
        break;
      default:
        sonnerToast(message);
    }
  };

  return { toast };
};