'use client';

import { Toaster as SonnerToaster } from 'sonner';
import { toast } from 'sonner';
import type { ToastProps } from '@/hooks/use-toast';
export { useToast } from '@/hooks/use-toast';

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

export { toast };
export type { ToastProps };