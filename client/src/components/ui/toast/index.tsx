// Single source of truth for toast functionality
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastTitle,
  ToastViewport,
  type ToastActionElement,
} from './toast';
import { Toaster } from './toaster';
import { ToastProvider, useToast } from './provider';
import type { Toast as ToastType, ToastProps } from './types';

export {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastTitle,
  ToastViewport,
  Toaster,
  ToastProvider,
  useToast,
};

export type { ToastActionElement, ToastType, ToastProps };