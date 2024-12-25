// Single source of truth for toast functionality
export {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastTitle,
  ToastViewport,
  type ToastActionElement,
} from './toast';
export { Toaster } from './toaster';
export { ToastProvider, useToast } from './provider';
export type { Toast as ToastType, ToastProps } from './types';

// Clean up legacy exports
export const ToastRoot = Toast;
export const ToastTitlePrimitive = ToastTitle;
export const ToastDescriptionPrimitive = ToastDescription;
export const ToastClosePrimitive = ToastClose;
export const ToastViewportPrimitive = ToastViewport;