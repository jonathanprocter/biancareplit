import { AlertCircle } from 'lucide-react';
import { ErrorBoundary } from 'react-error-boundary';
import { Route, Switch } from 'wouter';

import ContentFlashcardIntegration from './components/ContentFlashcardIntegration';
import { Card, CardContent } from './components/ui/card';
import { Toaster } from './components/ui/toaster';

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
    <>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <div className="min-h-screen w-full flex flex-col bg-background">
          <main className="flex-1 flex items-center justify-center p-4">
            <Switch>
              <Route path="/" component={Home} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </ErrorBoundary>
      <Toaster />
    </>
  );
}

function Home() {
  return (
    <div className="w-full">
      <ContentFlashcardIntegration />
    </div>
  );
}

function NotFound() {
  return (
    <div className="w-full">
      <Card className="w-full max-w-md mx-auto">
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