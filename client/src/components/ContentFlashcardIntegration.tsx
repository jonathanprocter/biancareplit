import { v4 as uuidv4 } from 'uuid';

import { useCallback, useEffect, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

import { cn } from '@/lib/utils';

import { useToast } from '@/hooks/use-toast';

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

const ContentFlashcardIntegration = (): JSX.Element => {
  const { toast } = useToast();
  const [initialized, setInitialized] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
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
      const validCompletedCards = Math.max(0, Number(completedCards) || 0);
      const validAccuracy = Math.min(1, Math.max(0, Number(accuracy) || 0));

      const progressValue = Math.min(
        100,
        ((validCompletedCards / 20) * 0.7 + validAccuracy * 0.3) * 100,
      );
      setProgress(Math.round(progressValue));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update progress');
      console.error('Error updating progress:', error);
      setProgress(0);
    }
  }, []);

  useEffect(() => {
    const initializeSystem = async (): Promise<void> => {
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

        setAnalytics(initialAnalytics);
        updateProgress(initialAnalytics.completedCards, initialAnalytics.accuracy);

        setStudySlots([
          {
            id: uuidv4(),
            startTime: Date.now(),
            category: 'content',
          },
        ]);

        setInitialized(true);
        toast({
          title: 'System Initialized',
          description: 'Flashcard system ready to use',
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to initialize');
        console.error('Failed to initialize:', error);
        setError(error);
        toast({
          variant: 'destructive',
          title: 'Initialization Failed',
          description: error.message,
        });
      } finally {
        setLoading(false);
      }
    };

    if (!initialized) {
      void initializeSystem();
    }
  }, [initialized, toast, updateProgress]);

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

  if (error) {
    return (
      <Card className="max-w-4xl mx-auto p-4">
        <CardContent className="p-6">
          <div className="text-destructive">
            <h3 className="text-xl font-semibold mb-2">Error Occurred</h3>
            <p>{error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto p-4 bg-card">
      <CardHeader>
        <CardTitle>Study Progress</CardTitle>
        <Progress value={progress} className="mt-4" />
        <p className="text-sm text-muted-foreground mt-2">{progress}% Complete</p>
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
