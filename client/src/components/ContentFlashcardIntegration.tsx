
import { v4 as uuidv4 } from 'uuid';
import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/ui/toast/use-toast';

import { cn } from '@/lib/utils';

interface AnalyticsData {
  totalStudyTime: number;
  completedCards: number;
  accuracy: number;
  categoryProgress: Record<string, number>;
  lastUpdate?: number;
}

interface StudySlot {
  id: string;
  startTime: number;
  endTime?: number;
  category?: string;
}

interface APIError extends Error {
  code?: string;
  statusCode?: number;
}

const ContentFlashcardIntegration = () => {
  const [initialized, setInitialized] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<APIError | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [studySlots, setStudySlots] = useState<StudySlot[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalStudyTime: 0,
    completedCards: 0,
    accuracy: 0,
    categoryProgress: {},
  });

  const updateProgress = useCallback((completedCards: number, accuracy = 0): void => {
    try {
      if (typeof completedCards !== 'number' || typeof accuracy !== 'number') {
        throw new Error('Invalid progress update parameters');
      }

      const validCompletedCards = Math.max(0, completedCards);
      const validAccuracy = Math.min(1, Math.max(0, accuracy));
      const progressValue = Math.min(
        100,
        ((validCompletedCards / 20) * 0.7 + validAccuracy * 0.3) * 100,
      );
      setProgress(Math.round(progressValue));
    } catch (error) {
      console.error('Error updating progress:', error);
      toast({
        variant: "destructive",
        title: "Progress Update Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred"
      });
      setProgress(0);
    }
  }, []);

  const initializeSystem = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const initialAnalytics: AnalyticsData = {
        totalStudyTime: 0,
        completedCards: 0,
        accuracy: 0,
        categoryProgress: {},
        lastUpdate: Date.now(),
      };

      await Promise.all([
        setAnalytics(initialAnalytics),
        updateProgress(initialAnalytics.completedCards, initialAnalytics.accuracy),
      ]);

      const newStudySlot: StudySlot = {
        id: uuidv4(),
        startTime: Date.now(),
        category: 'content',
      };

      setStudySlots([newStudySlot]);
      setInitialized(true);

      toast({
        title: "System Initialized",
        description: "Flashcard system ready to use"
      });
    } catch (error) {
      const apiError: APIError = error instanceof Error ? error : new Error('Failed to initialize system');
      apiError.code = 'INITIALIZATION_ERROR';
      console.error('Failed to initialize:', apiError.message);
      setError(apiError);

      toast({
        variant: "destructive",
        title: "Initialization Failed",
        description: apiError.message
      });
    } finally {
      setLoading(false);
    }
  }, [updateProgress]);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        if (mounted) {
          await initializeSystem();
        }
      } catch (error) {
        console.error('Initialization failed:', error instanceof Error ? error.message : 'Unknown error');
      }
    };

    void initialize();

    return () => {
      mounted = false;
    };
  }, [initializeSystem]);

  if (error) {
    return (
      <Card className="max-w-4xl mx-auto p-4">
        <CardContent className="p-6">
          <div className="text-destructive">
            <h3 className="text-xl font-semibold mb-2">Error Occurred</h3>
            <p>{error.message}</p>
            {error.code && <p className="text-sm mt-1">Error Code: {error.code}</p>}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="max-w-4xl mx-auto p-4">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
          <p className="text-center mt-2">Initializing flashcard system...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto p-4">
      <CardHeader>
        <CardTitle>Study Progress</CardTitle>
        <Progress value={progress} className="mt-4" />
        <p className="text-sm text-gray-500 mt-2">{progress}% Complete</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-semibold text-sm text-muted-foreground">Study Time</h4>
            <p className="text-2xl font-bold">{Math.floor(analytics.totalStudyTime / 60)}m</p>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-semibold text-sm text-muted-foreground">Cards Completed</h4>
            <p className="text-2xl font-bold">{analytics.completedCards}</p>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-semibold text-sm text-muted-foreground">Accuracy</h4>
            <p className="text-2xl font-bold">{Math.round(analytics.accuracy * 100)}%</p>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-semibold text-sm text-muted-foreground">Categories</h4>
            <p className="text-2xl font-bold">{Object.keys(analytics.categoryProgress).length}</p>
          </div>
        </div>
        <div className="space-y-4">
          <h4 className="font-semibold text-sm text-muted-foreground">Study Sessions</h4>
          {studySlots.map((slot) => (
            <div
              key={slot.id}
              className={cn(
                'flex justify-between items-center p-4 rounded-lg border',
                slot.id === studySlots[studySlots.length - 1]?.id
                  ? 'bg-primary/10 border-primary/20'
                  : 'bg-muted border-border',
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-3 h-3 rounded-full',
                    slot.id === studySlots[studySlots.length - 1]?.id
                      ? 'bg-primary animate-pulse'
                      : 'bg-muted-foreground',
                  )}
                />
                <span className="font-medium">Study Session</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {Math.floor(((slot.endTime || Date.now()) - slot.startTime) / 60000)}m{' '}
                {Math.floor((((slot.endTime || Date.now()) - slot.startTime) % 60000) / 1000)}s
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ContentFlashcardIntegration;
