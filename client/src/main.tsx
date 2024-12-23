import { createRoot } from 'react-dom';
import { QueryClientProvider } from 'react-query';

import { StrictMode } from 'react';

import App from './App';
import Toaster from './components/ui/toaster';
import './index.css';
import { queryClient } from './lib/queryClient';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found in the DOM');
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster />
    </QueryClientProvider>
  </StrictMode>,
);
