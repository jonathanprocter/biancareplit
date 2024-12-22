import { AlertCircle } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { Route, Switch } from 'wouter';

import { Card, CardContent } from '@/components/ui/card';

import Navigation from '@/components/Navigation';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Medical Education Platform</title>
        <meta charSet="utf-8" />
        <meta name="description" content="An advanced AI-powered medical education platform" />
      </Helmet>
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <Switch>
          <Route path="/">
            <Dashboard />
          </Route>
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
};

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Welcome to Medical Education Platform</h1>
      <p className="text-muted-foreground">Your personalized learning experience starts here.</p>
    </div>
  );
};

function NotFound() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-50">
      <Card className="mx-4 w-full max-w-md">
        <CardContent className="pt-6">
          <div className="mb-4 flex gap-2">
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
