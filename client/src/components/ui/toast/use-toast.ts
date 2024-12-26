
import { useContext } from 'react';
import { ToastActionElement, ToastProps } from './types';
import { ToastContext } from './toast-context';

const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export { useToast };
export type { ToastProps, ToastActionElement };
