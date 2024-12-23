import { AnimatePresence, motion } from 'framer-motion';
import { Brain, Coffee, Pause, Play, RotateCcw } from 'lucide-react';

import React, { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

import { useToast } from '@/hooks/use-toast';

interface TimerState {
  minutes: number;
  seconds: number;
  isActive: boolean;
  isBreak: boolean;
  completedSessions: number;
  focusScore: number;
  optimalDuration: number;
  sessionHistory: {
    duration: number;
    type: 'work' | 'break';
    completedAt: string;
    productivity: number;
  }[];
}

export const StudyTimer = () => {
  const [timer, setTimer] = useState<TimerState>({
    minutes: 25,
    seconds: 0,
    isActive: false,
    isBreak: false,
    completedSessions: 0,
    focusScore: 0,
    optimalDuration: 25,
    sessionHistory: [],
  });
  const [motivation, setMotivation] = useState<string>('');
  const { toast } = useToast();

  const motivationalMessages = [
    'Great focus! Keep going!',
    "You're making excellent progress!",
    "Stay determined, you're doing great!",
    'Each session brings you closer to mastery!',
    'Your dedication is inspiring!',
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (timer.isActive) {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev.seconds === 0) {
            if (prev.minutes === 0) {
              handleTimerComplete();
              return prev;
            } else {
              return {
                ...prev,
                minutes: prev.minutes - 1,
                seconds: 59,
              };
            }
          } else {
            return {
              ...prev,
              seconds: prev.seconds - 1,
            };
          }
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer]);

  const calculateOptimalDuration = (sessionHistory: TimerState['sessionHistory']) => {
    if (sessionHistory.length < 2) return 25;

    const recentSessions = sessionHistory.slice(-5);
    const averageProductivity =
      recentSessions.reduce((sum, session) => sum + session.productivity, 0) /
      recentSessions.length;

    if (averageProductivity > 0.8) return Math.min(timer.optimalDuration + 5, 45);
    if (averageProductivity < 0.6) return Math.max(timer.optimalDuration - 5, 15);
    return timer.optimalDuration;
  };

  const calculateFocusScore = (sessionHistory: TimerState['sessionHistory']) => {
    if (sessionHistory.length === 0) return 0;
    const recentSessions = sessionHistory.slice(-3);
    return (
      (recentSessions.reduce((sum, session) => sum + session.productivity, 0) /
        recentSessions.length) *
      100
    );
  };

  const handleTimerComplete = () => {
    const isBreakCompleted = timer.isBreak;
    const newCompletedSessions = isBreakCompleted
      ? timer.completedSessions
      : timer.completedSessions + 1;

    const newSessionHistory = [
      ...timer.sessionHistory,
      {
        duration: timer.isBreak ? (newCompletedSessions % 4 === 0 ? 15 : 5) : timer.optimalDuration,
        type: timer.isBreak ? 'break' : 'work',
        completedAt: new Date().toISOString(),
        productivity: timer.isBreak ? 1 : Math.random() * 0.4 + 0.6,
      },
    ];

    const newOptimalDuration = calculateOptimalDuration(newSessionHistory);
    const newFocusScore = calculateFocusScore(newSessionHistory);

    setTimer({
      ...timer,
      minutes: timer.isBreak ? newOptimalDuration : 5,
      seconds: 0,
      isActive: false,
      isBreak: !timer.isBreak,
      completedSessions: newCompletedSessions,
      focusScore: newFocusScore,
      optimalDuration: newOptimalDuration,
      sessionHistory: newSessionHistory,
    });

    toast({
      title: timer.isBreak ? 'Break Complete!' : 'Session Complete!',
      description: timer.isBreak
        ? "Time to get back to studying! You've got this!"
        : 'Great work! Take a short break to recharge.',
    });

    setMotivation(motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)]);
  };

  const toggleTimer = () => {
    setTimer((prev) => ({ ...prev, isActive: !prev.isActive }));
  };

  const resetTimer = () => {
    setTimer((prev) => ({
      ...prev,
      minutes: prev.isBreak ? 5 : prev.optimalDuration,
      seconds: 0,
      isActive: false,
    }));
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6">
        <div className="flex flex-col items-center space-y-6">
          <div className="flex items-center space-x-2">
            {timer.isBreak ? (
              <Coffee className="h-6 w-6 text-blue-500" />
            ) : (
              <Brain className="h-6 w-6 text-green-500" />
            )}
            <h2 className="text-2xl font-bold">{timer.isBreak ? 'Break Time' : 'Study Session'}</h2>
          </div>

          <div className="text-6xl font-mono">
            {String(timer.minutes).padStart(2, '0')}:{String(timer.seconds).padStart(2, '0')}
          </div>

          <div className="flex space-x-4">
            <Button onClick={toggleTimer} size="lg">
              {timer.isActive ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <Button onClick={resetTimer} variant="outline" size="lg">
              <RotateCcw className="h-5 w-5" />
            </Button>
          </div>

          <div className="w-full space-y-2">
            <div className="flex justify-between text-sm">
              <span>Focus Score</span>
              <span>{Math.round(timer.focusScore)}%</span>
            </div>
            <Progress value={timer.focusScore} className="h-2" />
          </div>

          <AnimatePresence>
            {motivation && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center text-sm text-gray-600"
              >
                {motivation}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
};

export default StudyTimer;
