import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Brain, BookOpen, Target, TrendingUp, Clock } from 'lucide-react';
import { useGenerateLearningPath, useLearningPaths } from '@/lib/api';

export function LearningPathRecommendations() {
  const { toast } = useToast();
  const userId = parseInt(localStorage.getItem('userId') || '0');
  const generatePath = useGenerateLearningPath();
  const { data: learningPaths, isLoading, error } = useLearningPaths(userId);

  const handleGeneratePath = async () => {
    try {
      await generatePath.mutateAsync(userId);
      toast({
        title: 'Success',
        description: 'New learning path generated successfully!',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate learning path',
      });
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-blue-100 text-blue-800';
      case 'advanced':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (error) {
    return (
      <Card className="bg-red-50">
        <CardContent className="pt-6">
          <div className="text-red-600">Failed to load learning paths: {error.message}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Your Learning Paths</h2>
        <Button
          onClick={handleGeneratePath}
          disabled={generatePath.isPending}
          className="flex items-center gap-2"
        >
          <Brain className="h-4 w-4" />
          Generate New Path
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      ) : learningPaths?.length ? (
        learningPaths.map((path) => (
          <Card key={path.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  {path.name}
                </span>
                <Badge className={getDifficultyColor(path.difficulty)}>
                  {path.difficulty}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">{path.description}</p>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span>
                    {Math.round(path.estimatedCompletionTime / 60)} hours estimated
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-gray-500" />
                  <span>{path.courses.length} courses</span>
                </div>
              </div>

              <div className="space-y-4">
                {path.courses.map(({ course, order, isRequired }, index) => (
                  <div
                    key={course.id}
                    className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium flex items-center gap-2">
                        <span className="text-sm text-gray-500">#{order}</span>
                        {course.title}
                      </h3>
                      {isRequired && (
                        <Badge variant="secondary">Required</Badge>
                      )}
                    </div>
                    
                    {course.matchDetails && (
                      <div className="mt-4 space-y-2">
                        <h4 className="text-sm font-medium text-gray-700">Match Details:</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="text-sm text-gray-600">Topic Match</div>
                            <Progress value={course.matchDetails.topicMatch * 10} className="h-2" />
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Time Fit</div>
                            <Progress value={course.matchDetails.timeMatch * 10} className="h-2" />
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Difficulty Match</div>
                            <Progress value={course.matchDetails.difficultyMatch * 10} className="h-2" />
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Learning Pace</div>
                            <Progress value={course.matchDetails.learningPace * 10} className="h-2" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-gray-500">
              No learning paths available. Generate one to get started!
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
