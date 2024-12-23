import * as React from 'react';

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast';

import { useToast } from '@/contexts/toast-context';

export function Toaster() {
  const { toasts } = useToast();
  return null; // The toasts are now rendered by the ToastProvider
}