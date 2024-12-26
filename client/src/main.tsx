import { QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { Toaster } from '@/components/ui/toast';
import App from './App';
import './index.css';
import { queryClient } from './lib/queryClient';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster />
    </QueryClientProvider>
  </StrictMode>,
);