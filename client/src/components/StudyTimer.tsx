import { AnimatePresence, motion } from 'framer-motion';
import { Brain, Coffee, Pause, Play, RotateCcw, Timer } from 'lucide-react';

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
        if (timer.seconds === 0) {
          if (timer.minutes === 0) {
            // Timer completed
            handleTimerComplete();
          } else {
            setTimer((prev) => ({
              ...prev,
              minutes: prev.minutes - 1,
              seconds: 59,
            }));
          }
        } else {
          setTimer((prev) => ({
            ...prev,
            seconds: prev.seconds - 1,
          }));
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer.isActive, timer.minutes, timer.seconds]);

  const calculateOptimalDuration = (sessionHistory: TimerState['sessionHistory']) => {
    if (sessionHistory.length < 2) return 25; // Default Pomodoro duration

    const recentSessions = sessionHistory.slice(-5);
    const averageProductivity =
      recentSessions.reduce((sum, session) => sum + session.productivity, 0) /
      recentSessions.length;

    // Adjust duration based on productivity trends
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

    // Record session completion
    const newSessionHistory = [
      ...timer.sessionHistory,
      {
        duration: timer.isBreak ? (newCompletedSessions % 4 === 0 ? 15 : 5) : timer.optimalDuration,
        type: timer.isBreak ? 'break' : 'work',
        completedAt: new Date().toISOString(),
        productivity: Math.random() * 0.4 + 0.6, // Simulated productivity score between 0.6 and 1.0
      },
    ];

    // Calculate new optimal duration and focus score
    const newOptimalDuration = calculateOptimalDuration(newSessionHistory);
    const newFocusScore = calculateFocusScore(newSessionHistory);

    // Play notification sound
    const audio = new Audio('/notification.mp3');
    audio.play().catch(() => {}); // Ignore if audio fails to play

    if (isBreakCompleted) {
      // Break completed, start work session with optimized duration
      setTimer({
        minutes: timer.optimalDuration,
        seconds: 0,
        isActive: false,
        isBreak: false,
        completedSessions: newCompletedSessions,
        focusScore: newFocusScore,
        optimalDuration: newOptimalDuration,
        sessionHistory: newSessionHistory,
      });
      toast({
        title: 'Break Complete!',
        description: 'Time to focus on your studies again.',
      });
    } else {
      // Work session completed, start break
      const longBreak = newCompletedSessions % 4 === 0;
      setTimer({
        minutes: longBreak ? 15 : 5,
        seconds: 0,
        isActive: false,
        isBreak: true,
        completedSessions: newCompletedSessions,
        focusScore: timer.focusScore,
        optimalDuration: timer.optimalDuration,
        sessionHistory: newSessionHistory,
      });
      toast({
        title: 'Session Complete!',
        description: `Time for a ${longBreak ? '15' : '5'} minute break!`,
      });
    }

    // Set new motivational message
    setMotivation(motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)]);
  };

  const toggleTimer = () => {
    setTimer((prev) => ({
      ...prev,
      isActive: !prev.isActive,
    }));
  };

  const resetTimer = () => {
    setTimer({
      minutes: 25,
      seconds: 0,
      isActive: false,
      isBreak: false,
      completedSessions: 0,
      focusScore: 0,
      optimalDuration: 25,
      sessionHistory: [],
    });
    setMotivation('');
  };

  const calculateProgress = () => {
    const totalSeconds = timer.isBreak
      ? (timer.completedSessions % 4 === 0 ? 15 : 5) * 60
      : 25 * 60;
    const remainingSeconds = timer.minutes * 60 + timer.seconds;
    return ((totalSeconds - remainingSeconds) / totalSeconds) * 100;
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Timer className="w-5 h-5" />
              {timer.isBreak ? 'Break Time' : 'Optimized Study Session'}
            </h3>
            <div className="flex items-center gap-2">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="bg-primary/10 px-3 py-1 rounded-full text-sm"
              >
                {timer.completedSessions} sessions completed
              </motion.div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-primary/5 p-3 rounded-lg">
              <div className="text-sm text-muted-foreground">Focus Score</div>
              <div className="text-2xl font-semibold">{Math.round(timer.focusScore)}%</div>
            </div>
            <div className="bg-primary/5 p-3 rounded-lg">
              <div className="text-sm text-muted-foreground">Optimal Duration</div>
              <div className="text-2xl font-semibold">{timer.optimalDuration}min</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center space-y-6">
          <div className="relative w-full">
            <Progress value={calculateProgress()} className="h-3" />
          </div>

          <motion.div
            key={`${timer.minutes}:${timer.seconds}`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-4xl font-bold"
          >
            {String(timer.minutes).padStart(2, '0')}:{String(timer.seconds).padStart(2, '0')}
          </motion.div>

          <div className="flex gap-4">
            <Button
              variant={timer.isActive ? 'destructive' : 'default'}
              size="lg"
              onClick={toggleTimer}
              className="flex items-center gap-2"
            >
              {timer.isActive ? (
                <>
                  <Pause className="w-4 h-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Start
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={resetTimer}
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
          </div>

          <AnimatePresence mode="wait">
            {motivation && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center"
              >
                <p className="text-sm text-muted-foreground flex items-center gap-2 justify-center">
                  {timer.isBreak ? <Coffee className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
                  {motivation}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
};

export default StudyTimer;
