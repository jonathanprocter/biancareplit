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
import { Helmet } from 'react-helmet';
// Assuming you have installed react-helmet
import { ROUTES } from '@/constants/routes'; // centralizing route paths

function App() {
  const [location] = useLocation();

  const isAuthPage = [ROUTES.HOME, ROUTES.REGISTER].includes(location);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>My App</title>
        <meta charSet="utf-8" />
        <meta name="description" content="A sample app" />
      </Helmet>
      {!isAuthPage && <Navigation />}
      <main className="container mx-auto px-4 py-8">
        <Switch>
          <Route path={ROUTES.HOME} component={Login} />
          <Route path={ROUTES.REGISTER} component={Register} />
          <Route path={ROUTES.DASHBOARD} component={Dashboard} />
          <Route path={ROUTES.COURSE} component={Course} />
          <Route path={ROUTES.PROGRESS} component={UserProgress} />
          <Route path={ROUTES.LEARNING_STYLE_QUIZ} component={LearningStyleQuiz} />
          <Route path={ROUTES.LEARNING_PATHS} component={LearningPathRecommendations} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

// Error boundary class component or use a library for error boundaries
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.log(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }

    return this.props.children; 
  }
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