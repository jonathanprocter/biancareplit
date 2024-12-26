import { toast } from 'sonner';
import { useContext } from 'react';
// Assuming ToastContext is defined elsewhere
import { ToastContext } from './ToastContext'; // Or wherever your context is defined


export interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  const { toast } = useContext(ToastContext);
  return { toast };
}