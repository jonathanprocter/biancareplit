import { useState } from 'react';
import { Toaster, toast } from 'sonner';
import { Switch, Route } from 'wouter';

function Home() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-4">Medical Education Platform</h1>
        <p className="text-gray-600 mb-4">Welcome to your personalized learning experience</p>
        <div>Current count: {count}</div>
        <button 
          onClick={() => {
            setCount(prev => prev + 1);
            toast.success(`Counter updated to ${count + 1}`);
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Increment Count
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <>
      <Switch>
        <Route path="/" component={Home} />
        <Route>404: Page Not Found</Route>
      </Switch>
      <Toaster />
    </>
  );
}

export default App;