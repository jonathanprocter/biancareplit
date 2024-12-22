import { QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';

import { StrictMode } from 'react';

import { Toaster } from '@/components/ui/toaster';

import App from './App';
import './index.css';
import { queryClient } from './lib/queryClient';

function initializeApp() {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found in the DOM');
  }

  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster />
      </QueryClientProvider>
    </StrictMode>,
  );
}

try {
  initializeApp();
} catch (error) {
  console.error(
    'Error initializing application:',
    error instanceof Error ? error.message : 'Unknown error',
  );
}
