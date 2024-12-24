import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { cn } from '../../lib/utils';
import flashcardSystem from '../flashcard-system';

// Error message component
const ErrorMessage = ({ error, onRetry }) => (
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
    <CardContent className="p-6">
      <div className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
      <p className="text-center mt-2">Initializing flashcard system...</p>
    </CardContent>
  </Card>
);

const ContentFlashcardIntegration = () => {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState({
    totalStudyTime: 0,
    completedCards: 0,
    accuracy: 0,
    categoryProgress: {},
    lastUpdate: null,
  });
  const [studySlots, setStudySlots] = useState([]);
  const [progress, setProgress] = useState(0);

  const updateProgress = useCallback((completedCards, accuracy = 0, categories = {}) => {
    const BASE_TARGET = 20;
    const ACCURACY_WEIGHT = 0.3;
    const COMPLETION_WEIGHT = 0.4;
    const CATEGORY_WEIGHT = 0.3;

    // Calculate completion progress using logarithmic scale
    const completionProgress = Math.min(
      1,
      Math.log(completedCards + 1) / Math.log(BASE_TARGET + 1),
    );

    // Calculate category coverage
    const uniqueCategories = Object.keys(categories).length;
    const TARGET_CATEGORIES = 5;
    const categoryProgress = Math.min(1, uniqueCategories / TARGET_CATEGORIES);

    // Weighted average of all components
    const totalProgress =
      (completionProgress * COMPLETION_WEIGHT +
        accuracy * ACCURACY_WEIGHT +
        categoryProgress * CATEGORY_WEIGHT) *
      100;

    setProgress(Math.min(100, Math.max(0, Math.round(totalProgress))));
  }, []);

  const initializeSystem = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!flashcardSystem.initialized) {
        await flashcardSystem.initialize();
      }

      const initialAnalytics = await flashcardSystem.initializeAnalytics();
      setAnalytics({
        totalStudyTime: Math.max(0, Number(initialAnalytics.totalStudyTime) || 0),
        completedCards: Math.max(0, Number(initialAnalytics.completedCards) || 0),
        accuracy: Math.min(1, Math.max(0, Number(initialAnalytics.accuracy) || 0)),
        categoryProgress: initialAnalytics.categoryProgress || {},
        lastUpdate: Date.now(),
      });

      updateProgress(initialAnalytics.completedCards || 0);
      const session = flashcardSystem.startNewSession('content');
      setStudySlots([session]);
      setInitialized(true);
    } catch (err) {
      console.error('Failed to initialize:', err);
      setError(err.message || 'Failed to initialize flashcard system');
    } finally {
      setLoading(false);
    }
  }, [updateProgress]);

  const updateAnalytics = useCallback(async () => {
    if (!initialized) return;

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

      setAnalytics(prev => ({
        ...prev,
        totalStudyTime: Math.max(prev.totalStudyTime, updatedAnalytics.totalStudyTime || 0),
        completedCards: Math.max(prev.completedCards, updatedAnalytics.completedCards || 0),
        accuracy: Math.min(1, Math.max(0, updatedAnalytics.accuracy || 0)),
        categoryProgress: {
          ...prev.categoryProgress,
          ...updatedAnalytics.categoryProgress,
        },
        lastUpdate: now,
      }));

      updateProgress(updatedAnalytics.completedCards || 0);
    } catch (err) {
      console.error('Analytics update failed:', err);
    }
  }, [initialized, studySlots, analytics, updateProgress]);

  useEffect(() => {
    initializeSystem();

    return () => {
      if (initialized && flashcardSystem.initialized) {
        flashcardSystem.endCurrentSession();
      }
    };
  }, [initializeSystem, initialized]);

  useEffect(() => {
    if (initialized) {
      const timer = setInterval(updateAnalytics, 300000); // 5 minutes
      return () => {
        clearInterval(timer);
        updateAnalytics();
      };
    }
  }, [initialized, updateAnalytics]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} onRetry={initializeSystem} />;

  return (
    <Card className="max-w-4xl mx-auto p-4">
      <CardHeader>
        <CardTitle>Study Progress</CardTitle>
        <Progress value={progress} className="mt-4" />
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <h4 className="font-semibold text-sm text-gray-600">Study Time</h4>
            <p className="text-2xl font-bold">
              {Math.floor(analytics.totalStudyTime / 60)}m
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-gray-600">Cards Completed</h4>
            <p className="text-2xl font-bold">{analytics.completedCards}</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-gray-600">Accuracy</h4>
            <p className="text-2xl font-bold">
              {Math.round(analytics.accuracy * 100)}%
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-gray-600">Categories</h4>
            <p className="text-2xl font-bold">
              {Object.keys(analytics.categoryProgress).length}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-sm text-gray-600">Study Sessions</h4>
          {studySlots.map((slot) => (
            <div
              key={slot.id}
              className={cn(
                'flex justify-between items-center p-3 rounded-lg border',
                slot.id === studySlots[studySlots.length - 1]?.id
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-gray-50 border-gray-200'
              )}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-2 h-2 rounded-full',
                    slot.id === studySlots[studySlots.length - 1]?.id
                      ? 'bg-blue-500 animate-pulse'
                      : 'bg-gray-400'
                  )}
                />
                <span className="font-medium">Study Session</span>
              </div>
              <span className="text-sm text-gray-600">
                {Math.floor(slot.duration / 60)}m {slot.duration % 60}s
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ContentFlashcardIntegration;