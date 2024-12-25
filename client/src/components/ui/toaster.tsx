import { Toast, ToastClose, ToastDescription, ToastTitle, useToast } from './toast';
import * as React from 'react';

export function Toaster() {
  const { toasts } = useToast();

  return (
    <div>
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
  );
}