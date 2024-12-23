import { QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';

import { StrictMode } from 'react';

import { Toaster } from '@/components/ui/toaster';

import { ToastProvider } from '@/lib/toast';

import App from './App';
import './index.css';
import { queryClient } from './lib/queryClient';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found in the DOM');
}

createRoot(rootElement).render(
  <StrictMode>
    <ToastProvider>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster />
      </QueryClientProvider>
    </ToastProvider>
  </StrictMode>,
);
