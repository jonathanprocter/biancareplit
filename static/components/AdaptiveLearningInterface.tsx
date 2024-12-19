import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, BookOpen, Target, Clock, CheckCircle } from 'lucide-react';
import { NCLEXQuestion } from '../types';
import { calculateTimeSpent, calculateConfidence } from '../lib/utils';

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
  const [currentContent, setCurrentContent] = useState<AdaptiveContent | null>(null);
  const [learningPatterns, setLearningPatterns] = useState<LearningPattern | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [studySession, setStudySession] = useState<StudySession>({
    startTime: Date.now(),
    questionStartTime: Date.now(),
    currentStreak: 0
  });

  useEffect(() => {
    // Fetch initial learning patterns and performance data
    fetchUserData();
  }, []);

  // Reset question timer when new content is loaded
  useEffect(() => {
    if (currentContent) {
      setStudySession(prev => ({
        ...prev,
        questionStartTime: Date.now()
      }));
    }
  }, [currentContent]);

  const fetchUserData = async (): Promise<void> => {
    try {
      const [patternsResponse, performanceResponse] = await Promise.all([
        fetch('/api/learning-patterns'),
        fetch('/api/performance-data')
      ]);

      const patterns: LearningPattern = await patternsResponse.json();
      const performance: PerformanceData = await performanceResponse.json();

      setLearningPatterns(patterns);
      setPerformanceData(performance);

      // Generate initial content based on patterns
      await generateAdaptiveContent(patterns, performance);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const generateAdaptiveContent = async (
    patterns: LearningPattern,
    performance: PerformanceData
  ): Promise<void> => {
    setLoading(true);
    try {
      const response = await fetch('/api/adaptive-content/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          learningPatterns: patterns,
          performanceData: performance
        })
      });

      const content: AdaptiveContent = await response.json();
      setCurrentContent(content);
    } catch (error) {
      console.error('Error generating content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSubmission = async (answer: number): Promise<void> => {
    if (!currentContent) return;
    
    setSelectedAnswer(answer);
    const timeSpent = calculateTimeSpent(studySession.questionStartTime);
    
    try {
      const response = await fetch('/api/adaptive-content/submit-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentId: currentContent.id,
          answer,
          timeSpent,
          confidenceLevel: calculateConfidence(
            timeSpent,
            answer === currentContent.options.indexOf(currentContent.correct_answer),
            isDifficultyLevel(currentContent.difficulty) ? currentContent.difficulty : 'medium'
          )
        })
      });

      const result: ApiResponse<{
        feedback: FeedbackData;
        patterns?: LearningPattern;
      }> = await response.json();

      if (result.success && result.data) {
        setFeedback(result.data.feedback);

        // Update learning patterns if provided
        if (result.data.patterns) {
          await updateLearningPatterns(result.data.patterns);
        }

        // Update study session stats
        setStudySession(prev => ({
          ...prev,
          currentStreak: result.data.feedback.correct ? prev.currentStreak + 1 : 0,
          questionStartTime: Date.now()
        }));
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      setFeedback({
        correct: false,
        message: 'Failed to submit answer. Please try again.',
        explanation: 'A network error occurred.'
      });
    }
  };

  const updateLearningPatterns = async (newPatterns: LearningPattern): Promise<void> => {
    setLearningPatterns(newPatterns);
    if (performanceData) {
      await generateAdaptiveContent(newPatterns, performanceData);
    }
  };

  const [adaptiveInsights, setAdaptiveInsights] = useState<{
    recommendedTopics: string[];
    strengthAreas: string[];
    difficultyLevel: string;
    learningTrend: 'improving' | 'stable' | 'needs_focus';
  }>({
    recommendedTopics: [],
    strengthAreas: [],
    difficultyLevel: 'beginner',
    learningTrend: 'stable'
  });

  useEffect(() => {
    if (performanceData) {
      updateAdaptiveInsights();
    }
  }, [performanceData]);

  const updateAdaptiveInsights = async () => {
    try {
      const response = await fetch('/api/nclex-coach/adaptive-insights', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const insights = await response.json();
        setAdaptiveInsights(insights);
      }
    } catch (error) {
      console.error('Error fetching adaptive insights:', error);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Adaptive Insights Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Adaptive Learning Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Recommended Focus Areas</h3>
              <ul className="list-disc pl-4">
                {adaptiveInsights.recommendedTopics.map((topic, index) => (
                  <li key={index} className="text-sm text-gray-600">{topic}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Strength Areas</h3>
              <ul className="list-disc pl-4">
                {adaptiveInsights.strengthAreas.map((area, index) => (
                  <li key={index} className="text-sm text-green-600">{area}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <span>Current Learning Level</span>
              <Badge 
                variant={
                  adaptiveInsights.learningTrend === 'improving' ? 'success' :
                  adaptiveInsights.learningTrend === 'stable' ? 'default' : 
                  'destructive'
                }
              >
                {adaptiveInsights.difficultyLevel}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Progress Overview */}
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
                <div className="mt-2 text-2xl">
                  {learningPatterns?.currentLevel || 'Beginner'}
                </div>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="font-semibold">Topics Mastered</div>
                <div className="mt-2 text-2xl">
                  {performanceData?.masteredTopics || 0}
                </div>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="font-semibold">Study Streak</div>
                <div className="mt-2 text-2xl">
                  {performanceData?.studyStreak || 0} days
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Adaptive Content
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : currentContent ? (
            <div className="space-y-6">
              {/* Question or Content Display */}
              <div className="p-4 border rounded-lg">
                <div className="font-medium mb-4">{currentContent.question}</div>
                
                <div className="space-y-2">
                  {currentContent.options?.map((option, index) => (
                    <Button
                      key={index}
                      variant={selectedAnswer === index ? "secondary" : "outline"}
                      className="w-full justify-start text-left"
                      onClick={() => handleAnswerSubmission(index)}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Feedback Display */}
              {feedback && (
                <div className={`p-4 rounded-lg ${
                  feedback.correct ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <div className="flex items-center gap-2">
                    <CheckCircle className={
                      feedback.correct ? 'text-green-500' : 'text-red-500'
                    } />
                    <span className="font-medium">
                      {feedback.message}
                    </span>
                  </div>
                  <div className="mt-2">
                    {feedback.explanation}
                  </div>
                </div>
              )}

              {/* Content Metadata */}
              <div className="flex flex-wrap gap-2">
                <Badge>
                  {currentContent.difficulty} Difficulty
                </Badge>
                <Badge variant="outline">
                  {currentContent.topic}
                </Badge>
                {currentContent.tags?.map(tag => (
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

      {/* Learning Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Learning Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {learningPatterns?.insights?.map((insight, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-blue-50">
                  <Brain className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <div className="font-medium">{insight.title}</div>
                  <div className="text-sm text-gray-600">
                    {insight.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdaptiveLearningInterface;
