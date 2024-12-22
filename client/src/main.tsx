import { QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { Toaster } from '@/components/ui/toaster';
import App from './App';
import './index.css';
import { queryClient } from './lib/queryClient';

function initializeApp(): void {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('Root element not found in the DOM');
    return;
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
  if (error instanceof Error) {
    console.error('Error initializing application:', error.message);
  } else {
    console.error('Unknown error during initialization:', error);
  }
}
