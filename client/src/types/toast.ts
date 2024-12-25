import type { ToastProps } from '@radix-ui/react-toast';
import type { ReactNode } from 'react';

export type ToastActionElement = React.ReactElement<unknown, string>;

export type ToasterToast = Pick<ToastProps, 'altText' | 'duration'> & {
  id: string;
  title?: ReactNode;
  description?: ReactNode;
  action?: ToastActionElement;
  variant?: 'default' | 'destructive';
};

export interface ToastContextType {
  toasts: ToasterToast[];
  toast: (props: Omit<ToasterToast, 'id'>) => void;
  dismiss: (toastId: string) => void;
}