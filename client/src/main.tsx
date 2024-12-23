import { QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import App from './App';
import { Toaster } from '@/components/ui/toaster';
import { queryClient } from './lib/queryClient';
import './index.css';

function Root() {
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster />
      </QueryClientProvider>
    </StrictMode>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found in the DOM');
}

createRoot(rootElement).render(<Root />);
