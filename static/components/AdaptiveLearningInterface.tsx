import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, BookOpen, Target, Clock, CheckCircle } from 'lucide-react';
import { NCLEXQuestion } from '../types';
import { calculateTimeSpent, calculateConfidence } from '../lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface LearningPattern {
  currentLevel: string;
  insights: Array<{
    title: string;
    description: string;
  }>;
}

interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

interface StudySession {
  startTime: number;
  questionStartTime: number;
  currentStreak: number;
}

interface PerformanceData {
  overallProgress: number;
  masteredTopics: number;
  studyStreak: number;
}

interface FeedbackData {
  correct: boolean;
  message: string;
  explanation: string;
}

import { DifficultyLevel, isDifficultyLevel } from '../lib/utils';

interface AdaptiveContent extends NCLEXQuestion {
  difficulty: string;
  topic: string;
  tags: string[];
}

const AdaptiveLearningInterface: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [studySession, setStudySession] = useState<StudySession>({
    startTime: Date.now(),
    questionStartTime: Date.now(),
    currentStreak: 0,
  });

  // Queries
  const { data: learningPatterns } = useQuery<LearningPattern>({
    queryKey: ['/api/learning-patterns'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: performanceData } = useQuery<PerformanceData>({
    queryKey: ['/api/performance-data'],
    staleTime: 5 * 60 * 1000,
  });

  const { data: adaptiveInsights, refetch: refetchInsights } = useQuery({
    queryKey: ['/api/nclex-coach/adaptive-insights'],
    staleTime: 5 * 60 * 1000,
  });

  // Mutations
  const generateContentMutation = useMutation({
    mutationFn: async (variables: {
      learningPatterns: LearningPattern;
      performanceData: PerformanceData;
    }) => {
      const response = await fetch('/api/adaptive-content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(variables),
      });
      if (!response.ok) throw new Error('Failed to generate content');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['currentContent'], data);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to generate adaptive content. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const submitAnswerMutation = useMutation({
    mutationFn: async (variables: {
      contentId: string;
      answer: number;
      timeSpent: number;
      confidenceLevel: number;
    }) => {
      const response = await fetch('/api/adaptive-content/submit-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(variables),
      });
      if (!response.ok) throw new Error('Failed to submit answer');
      return response.json();
    },
    onSuccess: (data) => {
      // Update patterns and generate new content
      queryClient.invalidateQueries({ queryKey: ['/api/learning-patterns'] });
      queryClient.invalidateQueries({ queryKey: ['/api/performance-data'] });
      refetchInsights();

      setStudySession((prev) => ({
        ...prev,
        currentStreak: data.feedback.correct ? prev.currentStreak + 1 : 0,
        questionStartTime: Date.now(),
      }));

      // Show feedback toast
      toast({
        title: data.feedback.correct ? 'Correct!' : 'Incorrect',
        description: data.feedback.message,
        variant: data.feedback.correct ? 'default' : 'destructive',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to submit answer. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Effects
  useEffect(() => {
    if (learningPatterns && performanceData) {
      generateContentMutation.mutate({ learningPatterns, performanceData });
    }
  }, [learningPatterns, performanceData]);

  // Handlers
  const handleAnswerSubmission = useCallback(
    (answer: number) => {
      const currentContent = queryClient.getQueryData<AdaptiveContent>(['currentContent']);
      if (!currentContent) return;

      const timeSpent = calculateTimeSpent(studySession.questionStartTime);
      const confidenceLevel = calculateConfidence(
        timeSpent,
        answer === currentContent.options.indexOf(currentContent.correct_answer),
        isDifficultyLevel(currentContent.difficulty) ? currentContent.difficulty : 'medium',
      );

      submitAnswerMutation.mutate({
        contentId: currentContent.id.toString(),
        answer,
        timeSpent,
        confidenceLevel,
      });
    },
    [studySession.questionStartTime, submitAnswerMutation],
  );

  // Memoized components
  const AdaptiveInsightsPanel = useMemo(
    () => (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Adaptive Learning Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          {adaptiveInsights && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="font-semibold">Recommended Focus Areas</h3>
                <ul className="list-disc pl-4">
                  {adaptiveInsights.recommendedTopics.map((topic, index) => (
                    <li key={index} className="text-sm text-gray-600">
                      {topic}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Strength Areas</h3>
                <ul className="list-disc pl-4">
                  {adaptiveInsights.strengthAreas.map((area, index) => (
                    <li key={index} className="text-sm text-green-600">
                      {area}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    ),
    [adaptiveInsights],
  );

  const currentContent = queryClient.getQueryData<AdaptiveContent>(['currentContent']);

  return (
    <div className="space-y-6 p-6">
      {AdaptiveInsightsPanel}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Learning Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Overall Progress</span>
              <span>{performanceData?.overallProgress || 0}%</span>
            </div>
            <Progress value={performanceData?.overallProgress || 0} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="font-semibold">Current Level</div>
                <div className="mt-2 text-2xl">{learningPatterns?.currentLevel || 'Beginner'}</div>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <div className="font-semibold">Topics Mastered</div>
                <div className="mt-2 text-2xl">{performanceData?.masteredTopics || 0}</div>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="font-semibold">Study Streak</div>
                <div className="mt-2 text-2xl">{performanceData?.studyStreak || 0} days</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Adaptive Content
          </CardTitle>
        </CardHeader>
        <CardContent>
          {generateContentMutation.isPending ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : currentContent ? (
            <div className="space-y-6">
              <div className="p-4 border rounded-lg">
                <div className="font-medium mb-4">{currentContent.question}</div>

                <div className="space-y-2">
                  {currentContent.options?.map((option, index) => (
                    <Button
                      key={index}
                      variant={
                        submitAnswerMutation.variables?.answer === index ? 'secondary' : 'outline'
                      }
                      className="w-full justify-start text-left"
                      onClick={() => handleAnswerSubmission(index)}
                      disabled={submitAnswerMutation.isPending}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge>{currentContent.difficulty} Difficulty</Badge>
                <Badge variant="outline">{currentContent.topic}</Badge>
                {currentContent.tags?.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500">
              No content available. Start by generating new content.
            </div>
          )}
        </CardContent>
      </Card>

      {learningPatterns?.insights && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Learning Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {learningPatterns.insights.map((insight, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-blue-50">
                    <Brain className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <div className="font-medium">{insight.title}</div>
                    <div className="text-sm text-gray-600">{insight.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdaptiveLearningInterface;