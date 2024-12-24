import React, { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

import { cn } from '@/lib/utils';

import { useToast } from '@/hooks/use-toast';

import flashcardSystem, { type AnalyticsData, type StudySession } from '../lib/flashcard-system';

interface ComponentAnalytics extends AnalyticsData {
  lastUpdate: number | null;
}

const ErrorMessage: React.FC<{ error: Error; onRetry: () => void }> = ({ error, onRetry }) => (
  <Card className="max-w-4xl mx-auto p-4">
    <CardContent className="p-6">
      <div className="text-center">
        <div className="text-destructive">
          <h3 className="text-xl font-semibold mb-2">Error Occurred</h3>
          <p className="mb-2">{error?.message || 'An unexpected error occurred'}</p>
        </div>
        <Button className="mt-4" onClick={onRetry}>
          Retry
        </Button>
      </div>
    </CardContent>
  </Card>
);

const LoadingSpinner: React.FC = () => (
  <Card className="max-w-4xl mx-auto p-4">
    <CardContent className="p-6 flex flex-col items-center justify-center">
      <div className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
      <p className="text-center mt-2">Initializing flashcard system...</p>
    </CardContent>
  </Card>
);

const ContentFlashcardIntegration: React.FC = () => {
  const { toast } = useToast();
  const [initialized, setInitialized] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [analytics, setAnalytics] = useState<ComponentAnalytics>({
    totalStudyTime: 0,
    completedCards: 0,
    accuracy: 0,
    categoryProgress: {},
    lastUpdate: null,
  });
  const [studySlots, setStudySlots] = useState<StudySession[]>([]);
  const [progress, setProgress] = useState<number>(0);

  const updateProgress = useCallback(
    (completedCards: number, accuracy = 0) => {
      try {
        const validCompletedCards = Math.max(0, Number(completedCards) || 0);
        const validAccuracy = Math.min(1, Math.max(0, Number(accuracy) || 0));
        const progressValue = Math.min(
          100,
          ((validCompletedCards / 20) * 0.7 + validAccuracy * 0.3) * 100,
        );
        setProgress(Math.round(progressValue));
      } catch (error) {
    try {
  if (error instanceof Error) {
    console.error(`Error: ${error.message}`);
    toast({
      variant: 'destructive',
      title: 'Error',
      description: error.message,
      duration: 3000
    });
  } else {
    console.error('An unknown error occurred:', error);
    toast({
      variant: 'destructive',
      title: 'Error',
      description: 'An unknown error occurred',
      duration: 3000
    });
  }
  setProgress(0);
} catch (e) {
  console.error('Error in error handler:', e);
  setProgress(0);
}
    },
    [toast],
  );

  const updateAnalytics = useCallback(async () => {
    if (!initialized || !flashcardSystem.isInitialized()) return;

    try {
      const currentSlot = flashcardSystem.getCurrentSession();
      if (!currentSlot?.id) return;

      const now = Date.now();
      const analyticsPayload = {
        duration: Math.max(0, now - currentSlot.startTime),
        category: String(currentSlot.category || 'general').toLowerCase(),
        slotId: currentSlot.id,
        completedCards: analytics.completedCards,
        accuracy: analytics.accuracy,
        categoryProgress: analytics.categoryProgress,
        timestamp: now,
      };

      const updatedAnalytics = await flashcardSystem.saveResult(analyticsPayload);
      if (!updatedAnalytics) return;

      setAnalytics((prev) => ({
        ...prev,
        totalStudyTime: Math.max(prev.totalStudyTime, updatedAnalytics.totalStudyTime || 0),
        completedCards: Math.max(prev.completedCards, updatedAnalytics.completedCards || 0),
        accuracy: Math.min(1, Math.max(0, updatedAnalytics.accuracy || 0)),
        categoryProgress: {
          ...prev.categoryProgress,
          ...(updatedAnalytics.categoryProgress || {}),
        },
        lastUpdate: now,
      }));

      updateProgress(updatedAnalytics.completedCards, updatedAnalytics.accuracy);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update analytics';
      console.error('Analytics update failed:', message);
      toast({
        variant: 'destructive',
        title: 'Analytics Update Failed',
        description: message,
      });
    }
  }, [initialized, analytics, toast, updateProgress]);

  const initializeSystem = useCallback(async () => {
    if (loading && initialized) return;

    try {
      setLoading(true);
      setError(null);

      if (!flashcardSystem.isInitialized()) {
        const initResult = await flashcardSystem.initialize();
        if (!initResult?.success) {
          throw new Error(initResult?.error || 'Failed to initialize flashcard system');
        }
      }

      const initialAnalytics = flashcardSystem.getAnalyticsData();
      setAnalytics({
        totalStudyTime: Math.max(0, initialAnalytics.totalStudyTime || 0),
        completedCards: Math.max(0, initialAnalytics.completedCards || 0),
        accuracy: Math.min(1, Math.max(0, initialAnalytics.accuracy || 0)),
        categoryProgress: initialAnalytics.categoryProgress || {},
        lastUpdate: Date.now(),
      });

      updateProgress(initialAnalytics.completedCards, initialAnalytics.accuracy);

      const session = flashcardSystem.startNewSession('content');
      setStudySlots([session]);
      setInitialized(true);

      toast({
        title: 'System Initialized',
        description: 'Flashcard system ready to use',
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to initialize');
      console.error('Failed to initialize:', err);
      setError(err);
      toast({
        variant: 'destructive',
        title: 'Initialization Failed',
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  }, [loading, initialized, toast, updateProgress]);

  useEffect(() => {
    initializeSystem();
    return () => {
      if (initialized) {
        flashcardSystem.cleanup();
      }
    };
  }, [initializeSystem, initialized]);

  useEffect(() => {
    if (initialized) {
      const timer = setInterval(updateAnalytics, 30000);
      return () => {
        clearInterval(timer);
        updateAnalytics();
      };
    }
  }, [initialized, updateAnalytics]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} onRetry={initializeSystem} />;

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-4xl mx-auto p-4">
        <CardHeader>
          <CardTitle>Study Progress</CardTitle>
          <Progress value={progress} className="mt-4" />
          <p className="text-sm text-muted-foreground mt-2">{progress}% Complete</p>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-secondary/10 rounded-lg">
              <h4 className="font-semibold text-sm text-muted-foreground">Study Time</h4>
              <p className="text-2xl font-bold">{Math.floor(analytics.totalStudyTime / 60)}m</p>
            </div>
            <div className="p-4 bg-secondary/10 rounded-lg">
              <h4 className="font-semibold text-sm text-muted-foreground">Cards Completed</h4>
              <p className="text-2xl font-bold">{analytics.completedCards}</p>
            </div>
            <div className="p-4 bg-secondary/10 rounded-lg">
              <h4 className="font-semibold text-sm text-muted-foreground">Accuracy</h4>
              <p className="text-2xl font-bold">{Math.round(analytics.accuracy * 100)}%</p>
            </div>
            <div className="p-4 bg-secondary/10 rounded-lg">
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
                    : 'bg-secondary/10 border-secondary/20',
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
                  {Math.floor((Date.now() - slot.startTime) / 60000)}m
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContentFlashcardIntegration;