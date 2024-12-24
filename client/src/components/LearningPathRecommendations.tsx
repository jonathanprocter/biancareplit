import { useQuery } from '@tanstack/react-query';
import { Book, Brain, GraduationCap, Lightbulb } from 'lucide-react';

import React from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

import { useToast } from '@/hooks/use-toast';

interface LearningPath {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedHours: number;
  completionPercentage: number;
  topics: string[];
}

export function LearningPathRecommendations() {
  const { toast } = useToast();

  const {
    data: learningPaths,
    isLoading,
    error,
  } = useQuery<LearningPath[]>({
    queryKey: ['/api/learning-paths/recommendations'],
    onError: (err) => {
      toast({
        title: 'Error',
        description: 'Failed to load learning path recommendations',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-6 w-2/3 bg-muted rounded" />
              <div className="mt-2 h-4 w-full bg-muted rounded" />
              <div className="mt-4 h-2 w-full bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-destructive">
            <Brain className="h-5 w-5" />
            <h3 className="font-semibold">Unable to Load Recommendations</h3>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Please try again later or contact support if the problem persists.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-5 w-5" />
        <h2 className="text-lg font-semibold">Recommended Learning Paths</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {learningPaths?.map((path) => (
          <Card key={path.id} className="relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{path.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{path.description}</p>
                </div>
                {path.difficulty === 'beginner' && <Book className="h-5 w-5 text-green-500" />}
                {path.difficulty === 'intermediate' && <Brain className="h-5 w-5 text-blue-500" />}
                {path.difficulty === 'advanced' && (
                  <GraduationCap className="h-5 w-5 text-purple-500" />
                )}
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{path.completionPercentage}%</span>
                </div>
                <Progress value={path.completionPercentage} className="mt-2" />
              </div>

              <div className="mt-4">
                <div className="text-sm font-medium">Topics Covered:</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {path.topics.map((topic) => (
                    <span
                      key={topic}
                      className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default LearningPathRecommendations;
