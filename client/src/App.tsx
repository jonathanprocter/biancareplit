import { Switch, Route } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { Toaster } from 'sonner';

function Home() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md mx-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Medical Education Platform</h1>
        <p className="text-gray-600">Welcome to your personalized learning experience</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Switch>
        <Route path="/" component={Home} />
      </Switch>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;