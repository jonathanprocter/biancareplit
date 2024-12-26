'use client';

import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  type ToastActionElement,
  type ToastProps,
} from './toast';
import { Toaster } from './toaster';
import { useToast, toast, type Toast as ToastType, type ToasterToast } from './use-toast';

// Re-export everything from a single source of truth
export {
  Toaster,
  ToastAction,
  ToastClose,
  ToastDescription,
  Toast,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  useToast,
  toast,
};

export type {
  ToastProps,
  ToastActionElement,
  ToastType,
  ToasterToast,
};