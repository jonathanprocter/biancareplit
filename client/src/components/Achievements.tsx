import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Trophy, Star, Award, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Badge {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  requiredPoints: number;
  category: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  earnedAt?: string;
}

interface UserProgress {
  totalPoints: number;
  accuracy: number;
  badges: Badge[];
}

const getTierIcon = (tier: string) => {
  switch (tier) {
    case 'platinum':
      return <Trophy className="h-8 w-8 text-blue-500" />;
    case 'gold':
      return <Star className="h-8 w-8 text-yellow-500" />;
    case 'silver':
      return <Award className="h-8 w-8 text-gray-400" />;
    default:
      return <Shield className="h-8 w-8 text-amber-600" />;
  }
};

export const Achievements = () => {
  const { toast } = useToast();
  const { data: progress, isLoading, error } = useQuery<UserProgress>({
    queryKey: ['/api/users/progress/achievements'],
  });

  if (isLoading) {
    return (
      <Card className="w-full max-w-3xl mx-auto">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    toast({
      variant: "destructive",
      title: "Error",
      description: "Failed to load achievements"
    });
    return null;
  }

  if (!progress) {
    return (
      <Card className="w-full max-w-3xl mx-auto">
        <CardContent className="p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Start Your Journey!</h2>
            <p className="text-muted-foreground">
              Complete lessons and earn badges to track your progress.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardContent className="p-6">
        <h2 className="text-2xl font-bold mb-4">Your Achievements</h2>
        
        {/* Overall Progress */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Total Points</span>
            <span className="text-sm font-medium">{progress.totalPoints}</span>
          </div>
          <Progress value={Math.min((progress.totalPoints / 1000) * 100, 100)} className="h-2" />
        </div>

        {/* Badges Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {progress.badges.map((badge) => (
            <div
              key={badge.id}
              className={`p-4 rounded-lg border ${
                badge.earnedAt ? 'bg-primary/5 border-primary' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-start gap-3">
                {getTierIcon(badge.tier)}
                <div>
                  <h3 className="font-semibold">{badge.name}</h3>
                  <p className="text-sm text-muted-foreground">{badge.description}</p>
                  {badge.earnedAt && (
                    <p className="text-xs text-primary mt-1">
                      Earned on {new Date(badge.earnedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Next Achievement */}
        {progress.badges.length < 10 && (
          <div className="mt-6 p-4 bg-primary/5 rounded-lg">
            <h3 className="font-semibold mb-2">Next Achievement</h3>
            <p className="text-sm text-muted-foreground">
              Complete more lessons and maintain a high accuracy rate to unlock more badges!
            </p>
            <div className="mt-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-muted-foreground">Progress</span>
                <span className="text-xs font-medium">{progress.accuracy}%</span>
              </div>
              <Progress value={progress.accuracy} className="h-1" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Achievements;
