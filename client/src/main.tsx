import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import { Toaster } from '@/components/ui/toaster';
import { ToastProvider } from '@/contexts/toast-context';
import { queryClient } from './lib/queryClient';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found in the DOM');
}

ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <ToastProvider>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster />
      </QueryClientProvider>
    </ToastProvider>
  </StrictMode>,
);
