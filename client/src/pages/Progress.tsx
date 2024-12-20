import { useState, useMemo } from 'react';
import { useUserProgress } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SkillTreeVisualization } from '@/components/SkillTreeVisualization';

export function UserProgress() {
  const userId = parseInt(localStorage.getItem('userId') || '1');
  const { data: progress, isLoading } = useUserProgress(userId);
  const [activeTab, setActiveTab] = useState('overview');

  // Transform progress data into skill tree format
  const skillTreeData = useMemo(() => {
    if (!progress) return [];

    return progress.enrollments.map(enrollment => ({
      id: enrollment.course.id.toString(),
      name: enrollment.course.title,
      level: Math.ceil(
        (enrollment.correctAnswers / enrollment.totalAttempts) * 3
      ),
      mastered: enrollment.correctAnswers / enrollment.totalAttempts > 0.8,
      prerequisites: enrollment.course.prerequisites || [],
      category: enrollment.course.category,
      description: enrollment.course.description,
    }));
  }, [progress]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <h1 className="text-3xl font-bold">Your Progress</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4 mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4 mt-2" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Your Progress</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'overview'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary hover:bg-secondary/80'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('skill-tree')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'skill-tree'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary hover:bg-secondary/80'
            }`}
          >
            Skill Tree
          </button>
        </div>
      </div>

      {activeTab === 'overview' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Overall Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Total Points</span>
                      <span className="text-sm font-medium">
                        {progress?.totalPoints}
                      </span>
                    </div>
                    <Progress
                      value={Math.min((progress?.totalPoints || 0) / 10, 100)}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Accuracy</span>
                      <span className="text-sm font-medium">
                        {progress?.accuracy}%
                      </span>
                    </div>
                    <Progress value={progress?.accuracy || 0} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Earned Badges</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {progress?.badges.map(badge => (
                    <div
                      key={badge.id}
                      className="group relative flex items-start space-x-3 p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                    >
                      <Badge className="h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
                      <div>
                        <h3 className="font-medium">{badge.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {badge.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Earned on{' '}
                          {new Date(badge.earnedAt!).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                        {badge.category}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Course Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {progress?.enrollments.map(enrollment => (
                  <div key={enrollment.id}>
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">
                        {enrollment.course.title}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {enrollment.correctAnswers} / {enrollment.totalAttempts}{' '}
                        correct
                      </span>
                    </div>
                    <Progress
                      value={
                        enrollment.totalAttempts > 0
                          ? (enrollment.correctAnswers /
                              enrollment.totalAttempts) *
                            100
                          : 0
                      }
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="h-[800px] p-4">
          <CardHeader>
            <CardTitle>Interactive Skill Tree</CardTitle>
          </CardHeader>
          <CardContent className="h-full">
            <SkillTreeVisualization
              skills={skillTreeData}
              width={window.innerWidth - 100}
              height={600}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
