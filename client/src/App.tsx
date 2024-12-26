import { AlertCircle } from 'lucide-react';
import { Route, Switch } from 'wouter';

import { Card, CardContent } from '@/components/ui/card';
import { Toaster } from '@/components/ui/toaster';

import { AIProcessor } from './components/AIProcessor';
import { CodeReviewStatus } from './components/CodeReviewStatus';
import ContentFlashcardIntegration from './components/ContentFlashcardIntegration';
import { DeploymentVerification } from './components/DeploymentVerification';
import ErrorBoundary from './components/ErrorBoundary';
import { IntegrationMonitor } from './components/IntegrationMonitor';
import { ProcessManager } from './components/ProcessManager';

function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen w-full flex flex-col bg-background">
        <main className="flex-1 flex items-center justify-center p-4">
          <Switch>
            <Route path="/">
              <div className="max-w-7xl mx-auto p-4 space-y-6">
                <ProcessManager />
                <IntegrationMonitor />
                <DeploymentVerification />
                <ContentFlashcardIntegration />
                <AIProcessor />
                <CodeReviewStatus />
              </div>
            </Route>
            <Route component={NotFound} />
          </Switch>
        </main>
        <Toaster />
      </div>
    </ErrorBoundary>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
          </div>
          <p className="mt-4 text-sm text-gray-600">The page you are looking for does not exist.</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;
