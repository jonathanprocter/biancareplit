import * as React from 'react';

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  useToast,
} from './toast';

export function Toaster() {
  const { toasts } = useToast();

  return (
    <>
      <ToastProvider>
        <div className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]">
          {toasts.map(({ id, title, description, action, ...props }) => (
            <Toast key={id} {...props}>
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && <ToastDescription>{description}</ToastDescription>}
              </div>
              {action}
              <ToastClose />
            </Toast>
          ))}
        </div>
        <ToastViewport />
      </ToastProvider>
    </>
  );
}
