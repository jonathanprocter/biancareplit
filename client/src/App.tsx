import { Switch, Route } from 'wouter';

function Home() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md mx-4 p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Medical Education Platform
        </h1>
        <p className="text-gray-600">
          Welcome to your personalized learning experience
        </p>
      </div>
    </div>
  );
}

function App() {
  return (
    <Switch>
      <Route path="/" component={Home} />
    </Switch>
  );
}

export default App;