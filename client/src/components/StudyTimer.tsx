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
    let interval: number | null = null;

    if (timer.isActive) {
      const tick = () => {
        if (timer.seconds === 0) {
          if (timer.minutes === 0) {
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
      };
      interval = window.setInterval(tick, 1000);
    }

    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [timer.isActive]);

  const calculateOptimalDuration = (sessionHistory: TimerState['sessionHistory']) => {
    if (sessionHistory.length < 2) return 25; // Default Pomodoro duration

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
        duration: timer.isBreak ? (newCompletedSessions % 4 === 0 ? 15 : 5) : timer.optimalDurati