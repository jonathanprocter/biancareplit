import { Switch, Route } from 'wouter';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { Dashboard } from '@/pages/Dashboard';
import { Course } from '@/pages/Courses';
import { UserProgress } from '@/pages/Progress';
import { LearningStyleQuiz } from '@/pages/LearningStyleQuiz';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Navigation } from '@/components/Navigation';

function App() {
  return (
    <>
      <Navigation />
      <Switch>
        <Route path="/" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/courses/:id" component={Course} />
        <Route path="/progress" component={UserProgress} />
        <Route path="/learning-style-quiz" component={LearningStyleQuiz} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">
              404 Page Not Found
            </h1>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            The page you are looking for does not exist.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;
