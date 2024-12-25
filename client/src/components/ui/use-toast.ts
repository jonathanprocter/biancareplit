import * as React from 'react';

import type { ToastActionElement, ToastProps } from './toast';

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 5000;

type ToasterState = {
  toasts: ToasterToast[];
};

export const toastStore = {
  state: { toasts: [] } as ToasterState,

  subscribe(callback: (state: ToasterState) => void) {
    const listeners = new Set<(state: ToasterState) => void>();
    listeners.add(callback);
    return () => listeners.delete(callback);
  },

  addToast(toast: ToasterToast) {
    this.state.toasts = [toast].concat(this.state.toasts).slice(0, TOAST_LIMIT);
  },

  dismissToast(toastId?: string) {
    this.state.toasts = this.state.toasts.filter((toast) => toast.id !== toastId);
  },
};

export function useToast() {
  const [toasts, setToasts] = React.useState<ToasterToast[]>([]);

  React.useEffect(() => {
    return toastStore.subscribe((state) => setToasts(state.toasts));
  }, []);

  const toast = React.useCallback((props: Omit<ToasterToast, 'id'>) => {
    const id = Math.random().toString(36).substring(2);
    const newToast = { ...props, id };
    toastStore.addToast(newToast);

    setTimeout(() => {
      toastStore.dismissToast(id);
    }, TOAST_REMOVE_DELAY);
  }, []);

  return {
    toast,
    dismiss: (toastId?: string) => toastStore.dismissToast(toastId),
    toasts,
  };
}

export { type ToasterToast };
