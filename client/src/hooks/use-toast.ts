import { toast as sonnerToast } from 'sonner';

export interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success' | 'error' | 'info';
}

export function useToast() {
  function toast(props: ToastProps) {
    const { title = '', description = '', variant = 'default' } = props;

    const options = {
      description,
      className: 'group toast',
    };

    switch (variant) {
      case 'success':
        return sonnerToast.success(title, options);
      case 'error':
      case 'destructive':
        return sonnerToast.error(title, options);
      case 'info':
        return sonnerToast.info(title, options);
      default:
        return sonnerToast(title, options);
    }
  }

  return { toast };
}

// Export a singleton instance for direct usage
export const { toast } = useToast();