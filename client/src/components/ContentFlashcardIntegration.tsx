import React, { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

import { cn } from '@/lib/utils';

import { useToast } from '@/hooks/use-toast';

import flashcardSystem from '../lib/flashcard-system';

// Error message component
const ErrorMessage = ({ error, onRetry }: { error: Error; onRetry: () => void }) => (
  <Card className="max-w-4xl mx-auto p-4">
    <CardContent className="p-6">
      <div className="text-center">
        <div className="text-red-600">
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

// Loading spinner component
const LoadingSpinner = () => (
  <Card className="max-w-4xl mx-auto p-4">
    <CardContent className="p-6 flex flex-col items-center justify-center">
      <div className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
      <p className="text-center mt-2">Initializing flashcard system...</p>
    </CardContent>
  </Card>
);

const ContentFlashcardIntegration = () => {
  const { toast } = useToast();
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [analytics, setAnalytics] = useState({
    totalStudyTime: 0,
    completedCards: 0,
    accuracy: 0,
    categoryProgress: {},
    lastUpdate: null as number | null,
  });
  const [studySlots, setStudySlots] = useState<any[]>([]);
  const [progress, setProgress] = useState(0);

  const updateProgress = useCallback((completedCards: number, accuracy = 0, categories = {}) => {
    try {
      const validCompletedCards = Math.max(0, Number(completedCards) || 0);
      const validAccuracy = Math.min(1, Math.max(0, Number(accuracy) || 0));
      const progressValue = Math.min(
        100,
        ((validCompletedCards / 20) * 0.7 + validAccuracy * 0.3) * 100,
      );
      setProgress(Math.round(progressValue));
    } catch (error) {
      console.error('Error updating progress:', error);
      setProgress(0);
    }
  }, []);

  const initializeSystem = useCallback(async () => {
    if (loading && initialized) return;

    try {
      setLoading(true);
      setError(null);

      if (!flashcardSystem.initialized) {
        const initResult = await flashcardSystem.initialize();
        if (!initResult?.success) {
          throw new Error(initResult?.error || 'Failed to initialize flashcard system');
        }
      }

      const initialAnalytics = await flashcardSystem.initializeAnalytics();
      if (!initialAnalytics) {
        throw new Error('Failed to initialize analytics');
      }

      setAnalytics({
        totalStudyTime: Math.max(0, Number(initialAnalytics.totalStudyTime) || 0),
        completedCards: Math.max(0, Number(initialAnalytics.completedCards) || 0),
        accuracy: Math.min(1, Math.max(0, Number(initialAnalytics.accuracy) || 0)),
        categoryProgress: initialAnalytics.categoryProgress || {},
        lastUpdate: Date.now(),
      });

      updateProgress(
        initialAnalytics.completedCards,
        initialAnalytics.accuracy,
        initialAnalytics.categoryProgress,
      );

      const session = flashcardSystem.startNewSession('content');
      setStudySlots([session]);
      setInitialized(true);

      toast({
        title: 'System Initialized',
        description: 'Flashcard system ready to use',
      });
    } catch (err) {
      console.error('Failed to initialize:', err);
      setError(err instanceof Error ? err : new Error('Failed to initialize'));
      toast({
        variant: 'destructive',
        title: 'Initialization Failed',
        description: err instanceof Error ? err.message : 'Failed to initialize flashcard system',
      });
    } finally {
      setLoading(false);
    }
  }, [loading, initialized, toast, updateProgress]);

  useEffect(() => {
    initializeSystem();
  }, [initializeSystem]);

  useEffect(() => {
    if (initialized) {
      const timer = setInterval(updateAnalytics, 30000); // Update every 30 seconds
      return () => {
        clearInterval(timer);
        updateAnalytics();
      };
    }
  }, [initialized, updateAnalytics]);

  const updateAnalytics = useCallback(async () => {
    if (!initialized || !flashcardSystem.initialized) return;

    try {
      const currentSlot = studySlots[studySlots.length - 1];
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
        accuracy: Math.min(1, Math.max(0, Number(updatedAnalytics.accuracy) || 0)),
        categoryProgress: {
          ...prev.categoryProgress,
          ...(updatedAnalytics.categoryProgress || {}),
        },
        lastUpdate: now,
      }));

      updateProgress(
        updatedAnalytics.completedCards,
        updatedAnalytics.accuracy,
        updatedAnalytics.categoryProgress,
      );
    } catch (err) {
      console.error('Analytics update failed:', err);
      toast({
        variant: 'destructive',
        title: 'Analytics Update Failed',
        description: 'Failed to update study progress',
      });
    }
  }, [initialized, studySlots, analytics, toast, updateProgress]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} onRetry={initializeSystem} />;

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-4xl mx-auto p-4 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Study Progress</CardTitle>
          <Progress value={progress} className="mt-4" />
          <p className="text-sm text-gray-500 mt-2">{progress}% Complete</p>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-sm text-gray-600">Study Time</h4>
              <p className="text-2xl font-bold">{Math.floor(analytics.totalStudyTime / 60)}m</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-sm text-gray-600">Cards Completed</h4>
              <p className="text-2xl font-bold">{analytics.completedCards}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-sm text-gray-600">Accuracy</h4>
              <p className="text-2xl font-bold">{Math.round(analytics.accuracy * 100)}%</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-sm text-gray-600">Categories</h4>
              <p className="text-2xl font-bold">{Object.keys(analytics.categoryProgress).length}</p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-gray-600">Study Sessions</h4>
            {studySlots.map((slot) => (
              <div
                key={slot.id}
                className={cn(
                  'flex justify-between items-center p-4 rounded-lg border',
                  slot.id === studySlots[studySlots.length - 1]?.id
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-gray-50 border-gray-200',
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-3 h-3 rounded-full',
                      slot.id === studySlots[studySlots.length - 1]?.id
                        ? 'bg-blue-500 animate-pulse'
                        : 'bg-gray-400',
                    )}
                  />
                  <span className="font-medium">Study Session</span>
                </div>
                <span className="text-sm text-gray-600">
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
