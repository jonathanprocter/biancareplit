'use client';

import { Toaster as SonnerToaster } from 'sonner';

export { useToast } from '@/hooks/use-toast';
export type { ToastProps } from '@/hooks/use-toast';

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'hsl(var(--background))',
          color: 'hsl(var(--foreground))',
          border: '1px solid hsl(var(--border))',
        },
      }}
    />
  );
}