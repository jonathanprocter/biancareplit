import { QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';

import { StrictMode } from 'react';

import App from './App';
import { ToastProvider } from './contexts/toast-context';
import './index.css';
import { queryClient } from './lib/queryClient';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ToastProvider>
  </StrictMode>,
);
