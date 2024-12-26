import { Switch, Route } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { ErrorBoundary } from './components/ErrorBoundary';
import { ContentFlashcardIntegration } from './components/ContentFlashcardIntegration';
import { Toaster } from '@/components/ui/toast';

function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen">
        <Switch>
          <Route path="/" component={HomePage} />
          <Route component={NotFound} />
        </Switch>
        <Toaster />
      </div>
    </ErrorBoundary>
  );
}

function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <ContentFlashcardIntegration />
    </div>
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
          <p className="mt-4 text-sm text-gray-600">
            The page you're looking for doesn't exist.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;