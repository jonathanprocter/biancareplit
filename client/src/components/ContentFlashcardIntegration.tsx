import { v4 as uuidv4 } from 'uuid';

import { useCallback, useEffect, useState } from 'react';

import { calculateProgress, cn, formatTimeSpent } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { useToast } from './ui/toast';

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

const ContentFlashcardIntegration = () => {
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

  const updateProgress = useCallback((completedCards: number, accuracy = 0) => {
    try {
      const progressValue = calculateProgress(completedCards, 20, accuracy);
      setProgress(progressValue);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error updating progress: ${error.message}`);
      } else {
        console.error('An unknown error occurred:', error);
      }
      setProgress(0);
    }
  }, []);

  useEffect(() => {
    const initializeSystem = async () => {
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

        const newStudySlot: StudySlot = {
          id: uuidv4(),
          startTime: Date.now(),
          category: 'content',
        };

        setStudySlots([newStudySlot]);
        setInitialized(true);

        toast({
          title: 'System Initialized',
          description: 'Flashcard system ready to use',
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to initialize system';
        console.error('Failed to initialize:', errorMessage);
        setError(error instanceof Error ? error : new Error(errorMessage));

        toast({
          variant: 'destructive',
          title: 'Initialization Failed',
          description: errorMessage,
        });
      } finally {
        setLoading(false);
      }
    };

    void initializeSystem();
  }, [toast, updateProgress]);

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
          <div className="text-red-500">
            <h3 className="text-xl font-semibold mb-2">Error Occurred</h3>
            <p>{error.message}</p>
          </div>
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
          <div className="p-4 bg-gray-100 rounded-lg">
            <h4 className="font-semibold text-sm text-gray-500">Study Time</h4>
            <p className="text-2xl font-bold">{Math.floor(analytics.totalStudyTime / 60)}m</p>
          </div>
          <div className="p-4 bg-gray-100 rounded-lg">
            <h4 className="font-semibold text-sm text-gray-500">Cards Completed</h4>
            <p className="text-2xl font-bold">{analytics.completedCards}</p>
          </div>
          <div className="p-4 bg-gray-100 rounded-lg">
            <h4 className="font-semibold text-sm text-gray-500">Accuracy</h4>
            <p className="text-2xl font-bold">{Math.round(analytics.accuracy * 100)}%</p>
          </div>
          <div className="p-4 bg-gray-100 rounded-lg">
            <h4 className="font-semibold text-sm text-gray-500">Categories</h4>
            <p className="text-2xl font-bold">{Object.keys(analytics.categoryProgress).length}</p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-sm text-gray-500">Study Sessions</h4>
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
              <span className="text-sm text-gray-500">
                {formatTimeSpent(slot.startTime, slot.endTime)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ContentFlashcardIntegration;
