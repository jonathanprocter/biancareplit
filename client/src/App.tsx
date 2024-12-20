import { Switch, Route, useLocation } from 'wouter';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { Dashboard } from '@/pages/Dashboard';
import { Course } from '@/pages/Courses';
import { UserProgress } from '@/pages/Progress';
import { LearningStyleQuiz } from '@/pages/LearningStyleQuiz';
import { LearningPathRecommendations } from '@/components/LearningPathRecommendations';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { DailyWelcomeCard } from '@/components/DailyWelcomeCard';
import { FileUploadWizard } from '@/components/FileUploadWizard';

function App() {
  const [location] = useLocation();
  const isAuthPage = location === '/' || location === '/register';

  return (
    <div className="min-h-screen bg-background">
      {!isAuthPage && <Navigation />}
      <main className="container mx-auto px-4 py-8">
        <Switch>
          <Route path="/" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/dashboard">
            {() => (
              <div className="space-y-8">
                <DailyWelcomeCard />
                <FileUploadWizard />
              </div>
            )}
          </Route>
          <Route path="/courses/:id" component={Course} />
          <Route path="/progress" component={UserProgress} />
          <Route path="/learning-style-quiz" component={LearningStyleQuiz} />
          <Route path="/learning-paths" component={LearningPathRecommendations} />
          <Route component={NotFound} />
        </Switch>
      </main>
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
          <p className="mt-4 text-sm text-gray-600">The page you are looking for does not exist.</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;
