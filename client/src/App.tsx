import { useState } from 'react';
import { toast } from './lib/toast';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    setCount((prev) => prev + 1);
    toast({
      title: 'Counter Updated',
      description: `Count is now ${count + 1}`,
      variant: 'info'
    });
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-4">Medical Education Platform</h1>
          <p className="text-gray-600 mb-4">Welcome to your personalized learning experience</p>
          <button 
            onClick={handleClick}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Test Toast: Count is {count}
          </button>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;