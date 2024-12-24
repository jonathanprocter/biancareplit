import { QueryClientProvider } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { ErrorBoundary } from 'react-error-boundary';
import { Route, Switch } from 'wouter';

import { Card, CardContent } from '@/components/ui/card';
import { Toaster } from '@/components/ui/toaster';

import ContentFlashcardIntegration from './components/ContentFlashcardIntegration';
import { queryClient } from './lib/queryClient';

// Error fallback component
function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <h1 className="text-2xl font-bold">Something went wrong</h1>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{error.message}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen flex flex-col bg-background text-foreground">
          <main className="flex-1">
            <Switch>
              <Route path="/" component={ContentFlashcardIntegration} />
              <Route component={NotFound} />
            </Switch>
          </main>
          <Toaster />
        </div>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

// fallback 404 not found page
function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <h1 className="text-2xl font-bold">404 Page Not Found</h1>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            The page you are looking for does not exist.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;
