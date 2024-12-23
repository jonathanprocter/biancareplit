import { QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';

import { StrictMode } from 'react';

import { ToastContextProvider } from '@/contexts/toast-context';

import App from './App';
import './index.css';
import { queryClient } from './lib/queryClient';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found in the DOM');
}

const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <ToastContextProvider>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ToastContextProvider>
  </StrictMode>,
);
