import { QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';

import { ToastProvider } from '@/contexts/toast-context';
import { Toaster } from '@/components/ui/toaster';
import App from './App';
import './index.css';
import { queryClient } from './lib/queryClient';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found in the DOM');
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <App />
        <Toaster />
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
);