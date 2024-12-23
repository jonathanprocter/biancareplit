import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import React from 'react';

import { Toaster } from './components/ui/toaster';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Your other app components go here */}
      <Toaster />
    </QueryClientProvider>
  );
}