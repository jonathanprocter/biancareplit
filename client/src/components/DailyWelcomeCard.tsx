import { motion } from 'framer-motion';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BookOpenIcon,
  Calendar,
  Clock,
  Target,
} from 'lucide-react';
import {
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useEffect, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { useToast } from '@/hooks/use-toast';

interface ProgressData {
  questionsAttempted: number;
  correctAnswers: number;
  flashcardsReviewed: number;
  timeSpent: number;
  strengthAreas: string[];
  weakAreas: string[];
  trends: {
    pastPerformance: number[];
    predictedPerformance: number[];
    targetPerformance: number;
    dates: string[];
  };
  learningPath: {
    currentTopic: string;
    nextTopics: string[];
    completionRate: number;
    estimatedTimeToTarget: number;
  };
}

export const DailyWelcomeCard = () => {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [greeting, setGreeting] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const { toast } = useToast();

  useEffect(() => {
    const updateTimeAndGreeting = () => {
      const now = new Date();
      setCurrentTime(now);
      const hour = now.getHours();
      if (hour < 12) setGreeting('Good Morning');
      else if (hour < 18) setGreeting('Good Afternoon');
      else setGreeting('Good Evening');
    };

    updateTimeAndGreeting();
    const timer = setInterval(updateTimeAndGreeting, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchDailyProgress = async () => {
      try {
        const response = await fetch('/api/progress/daily');
        if (!response.ok) throw new Error('Failed to fetch daily progress');

        const data = await response.json();
        setProgress(data);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load your daily progress',
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
            <div className="h-8 bg-gray-200 rounded w-3/4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            </div>
            <div className="h-32 bg-gray-200 rounded w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!progress) {
    return (
      <Card className="w-full max-w-3xl mx-auto">
        <CardContent className="p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Welcome!</h2>
            <p className="text-muted-foreground">
              Start learning to see your daily progress and insights.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const accuracyRate =
    progress.questionsAttempted > 0
      ? ((progress.correctAnswers / progress.questionsAttempted) * 100).toFixed(
          1,
        )
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="p-2 rounded-full bg-primary/10"
            >
              <Target className="h-6 w-6 text-primary" />
            </motion.div>
            <div>
              <motion.h2
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold"
              >
                {greeting}!
              </motion.h2>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-sm text-muted-foreground flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                {currentTime.toLocaleDateString()}
                <Clock className="h-4 w-4 ml-2" />
                {currentTime.toLocaleTimeString()}
              </motion.div>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Today's Progress</p>
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

          <div className="mt-6">
            <div className="p-4 bg-primary/5 rounded-lg">
              <h3 className="font-semibold mb-4">Your Learning Journey</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Current Performance:
                  </span>
                  <span className="font-medium">{accuracyRate}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Target Performance:
                  </span>
                  <span className="font-medium">
                    {progress.trends.targetPerformance}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Estimated Time to Target:
                  </span>
                  <span className="font-medium">
                    {progress.learningPath.estimatedTimeToTarget} days
                  </span>
                </div>
                <div className="mt-4">
                  <div className="h-24 w-full">
                    <LineChart
                      width={500}
                      height={96}
                      data={progress.trends.dates.map((date, i) => ({
                        date,
                        past: progress.trends.pastPerformance[i],
                        predicted: progress.trends.predictedPerformance[i],
                      }))}
                      margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
                    >
                      <XAxis dataKey="date" tick={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="past"
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="predicted"
                        stroke="#9333ea"
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        dot={false}
                      />
                      <ReferenceLine
                        y={progress.trends.targetPerformance}
                        stroke="#dc2626"
                        strokeDasharray="3 3"
                      />
                    </LineChart>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-primary/5 rounded-lg mt-4">
              <h3 className="font-semibold mb-2">Your Learning Path</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Current Topic:</p>
                  <p className="text-sm text-muted-foreground">
                    {progress.learningPath.currentTopic}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Coming Up Next:</p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    {progress.learningPath.nextTopics.map((topic, index) => (
                      <li key={index}>{topic}</li>
                    ))}
                  </ul>
                </div>
                <div className="pt-2">
                  <p className="text-sm font-medium">Completion Rate:</p>
                  <div className="w-full h-2 bg-gray-200 rounded-full mt-1">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{
                        width: `${progress.learningPath.completionRate}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {progress.learningPath.completionRate}% complete
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DailyWelcomeCard;
