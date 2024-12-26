import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        duration: 3000,
        className: 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100',
      }}
    />
  );
}
