import { useEffect, useState } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface AnalyticsData {
  totalStudyTime: number;
  completedCards: number;
  accuracy: number;
  categoryProgress: Record<string, number>;
}

const ContentFlashcardIntegration = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalStudyTime: 0,
    completedCards: 0,
    accuracy: 0,
    categoryProgress: {},
  });

  useEffect(() => {
    const initializeSystem = async () => {
      try {
        setLoading(true);
        // Initialize with default data for now
        setProgress(0);
        setAnalytics({
          totalStudyTime: 0,
          completedCards: 0,
          accuracy: 0,
          categoryProgress: {},
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to initialize'));
      } finally {
        setLoading(false);
      }
    };

    initializeSystem();
  }, []);

  if (loading) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardContent className="p-6">
          <div className="text-center">Loading system...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardContent className="p-6">
          <div className="text-destructive">
            <h3 className="font-semibold mb-2">Error Occurred</h3>
            <p>{error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <Card className="mb-6">
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold mb-4">Study Progress</h2>
          <Progress value={progress} />
          <p className="text-sm text-muted-foreground mt-2">{progress}% Complete</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">Study Time</h3>
            <p>{Math.floor(analytics.totalStudyTime / 60)}m</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">Cards Completed</h3>
            <p>{analytics.completedCards}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">Accuracy</h3>
            <p>{Math.round(analytics.accuracy * 100)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">Categories</h3>
            <p>{Object.keys(analytics.categoryProgress).length}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ContentFlashcardIntegration;
