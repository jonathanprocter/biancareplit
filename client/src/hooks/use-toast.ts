import { toast as sonnerToast } from 'sonner';

export interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success' | 'error' | 'info';
}

export function toast({ title, description, variant = 'default' }: ToastProps) {
  const message = description || title;
  if (!message) return;

  switch (variant) {
    case 'success':
      sonnerToast.success(message);
      break;
    case 'error':
    case 'destructive':
      sonnerToast.error(message);
      break;
    case 'info':
      sonnerToast.info(message);
      break;
    default:
      sonnerToast(message);
  }
}

export const useToast = () => {
  return { toast };
};