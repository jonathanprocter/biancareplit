import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';

import { type ReactNode } from 'react';

import { Toaster } from '@/components/ui/toaster';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

interface Props {
  children: ReactNode;
}

const Providers = ({ children }: Props): JSX.Element => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <div id="radix-portal" />
      <Toaster />
    </QueryClientProvider>
  );
};

const customRender = (ui: React.ReactElement, options = {}) =>
  render(ui, { wrapper: Providers, ...options });

export * from '@testing-library/react';
export { customRender as render };
