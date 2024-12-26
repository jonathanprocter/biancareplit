import { toast as sonnerToast } from 'sonner';

export interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success' | 'error' | 'info';
}

// Single source of truth for toast functionality
export const toast = (props: ToastProps) => {
  const title = props.title || '';
  const description = props.description;

  const options = {
    description: description,
  };

  switch (props.variant) {
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
};

// React hook for components
export const useToast = () => ({ toast });