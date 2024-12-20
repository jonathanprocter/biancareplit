import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowUpIcon, ArrowDownIcon, BookOpenIcon } from 'lucide-react';

interface ProgressData {
  questionsAttempted: number;
  correctAnswers: number;
  flashcardsReviewed: number;
  timeSpent: number;
  strengthAreas: string[];
  weakAreas: string[];
}

export const DailyWelcomeCard = () => {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchDailyProgress = async () => {
      try {
        const response = await fetch('/api/daily-progress');
        if (!response.ok) throw new Error('Failed to fetch daily progress');
        
        const data = await response.json();
        setProgress(data);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load your daily progress"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDailyProgress();
  }, [toast]);

  if (loading) {
    return (
      <Card className="w-full max-w-3xl mx-auto">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!progress) return null;

  const accuracyRate = progress.questionsAttempted > 0 
    ? (progress.correctAnswers / progress.questionsAttempted * 100).toFixed(1)
    : 0;

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardContent className="p-6">
        <h2 className="text-2xl font-bold mb-4">
          Welcome back! Here's your learning overview
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Yesterday's Progress</p>
            <div className="flex items-center gap-2">
              <BookOpenIcon className="h-5 w-5 text-primary" />
              <span className="font-medium">
                {progress.questionsAttempted} questions attempted
              </span>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">
                Accuracy rate: {accuracyRate}%
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Study Time</p>
            <p className="font-medium">{progress.timeSpent} minutes</p>
            <p className="text-sm text-muted-foreground">
              {progress.flashcardsReviewed} flashcards reviewed
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="flex items-center gap-2 font-semibold mb-2">
              <ArrowUpIcon className="h-4 w-4 text-green-500" />
              Strength Areas
            </h3>
            <ul className="list-disc list-inside text-sm space-y-1">
              {progress.strengthAreas.map((area, index) => (
                <li key={index}>{area}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="flex items-center gap-2 font-semibold mb-2">
              <ArrowDownIcon className="h-4 w-4 text-red-500" />
              Areas for Improvement
            </h3>
            <ul className="list-disc list-inside text-sm space-y-1">
              {progress.weakAreas.map((area, index) => (
                <li key={index}>{area}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 p-4 bg-primary/5 rounded-lg">
          <h3 className="font-semibold mb-2">Today's Study Recommendation</h3>
          <p className="text-sm text-muted-foreground">
            Focus on {progress.weakAreas[0]} today. We've prepared targeted questions 
            and flashcards to help strengthen your understanding in this area.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DailyWelcomeCard;
