import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { flashcardSystem } from '../flashcard-system';

export const StudyProgressTracker = ({ currentSession, analytics }) => {
  const [studyTime, setStudyTime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      if (currentSession?.startTime) {
        const elapsed = Math.floor((Date.now() - currentSession.startTime) / 1000);
        setStudyTime(elapsed);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [currentSession]);

  return (
    <Card className="mt-6">
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <h4 className="font-semibold text-sm text-gray-600">Current Session</h4>
            <p className="text-2xl font-bold">
              {Math.floor(studyTime / 60)}m {studyTime % 60}s
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-gray-600">Total Time</h4>
            <p className="text-2xl font-bold">
              {Math.floor(analytics.totalStudyTime / 60)}m
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-gray-600">Cards Done</h4>
            <p className="text-2xl font-bold">{analytics.completedCards}</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-gray-600">Accuracy</h4>
            <p className="text-2xl font-bold">{analytics.accuracy}%</p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-sm text-gray-600">Study Progress</h4>
          <Progress value={analytics.progress || 0} className="mb-4" />

          {Object.entries(analytics.categoryProgress).map(([category, progress]) => (
            <div key={category} className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">{category}</span>
                <span className="text-sm text-gray-600">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default StudyProgressTracker;
