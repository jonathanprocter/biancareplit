import { AlertCircle } from 'lucide-react';
import { ErrorBoundary } from 'react-error-boundary';
import { Route, Switch } from 'wouter';

import { Card, CardContent } from '@/components/ui/card';
import Navigation from '@/components/Navigation';
import { FileUploadWizard } from '@/components/FileUploadWizard';

// Error fallback component
function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold">Something went wrong</h1>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{error.message}</p>
        </CardContent>
      </Card>
    </div>
  );
}

// Dashboard component
function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome to Medical Education Platform
          </h1>
          <p className="text-muted-foreground">
            Your personalized learning experience starts here.
          </p>
        </div>
      </div>
    </div>
  );
}

// NotFound component
function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
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

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/upload" component={FileUploadWizard} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;