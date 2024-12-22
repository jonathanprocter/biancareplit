import { AlertCircle } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { Route, Switch } from 'wouter';

import { Card, CardContent } from '@/components/ui/card';

import { TestPrettier } from '@/components/TestPrettier';

function App() {
  const testItems = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Medical Education Platform</title>
        <meta charSet="utf-8" />
        <meta name="description" content="An advanced AI-powered medical education platform" />
      </Helmet>
      <main className="container mx-auto px-4 py-8">
        <Switch>
          <Route path="/">
            <TestPrettier title="Test Component" items={testItems} />
          </Route>
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

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
