import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Award, Book, Brain, Shield, Star, Target, Trophy, Zap } from 'lucide-react';

import React, { useCallback, useEffect } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

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
  streakCount: number;
  level: number;
  badges: Badge[];
  recentAchievements: {
    topic: string;
    score: number;
    date: string;
  }[];
}

const getTierIcon = (tier: string, category: string) => {
  const baseClass = 'h-8 w-8';
  switch (category) {
    case 'learning':
      return <Brain className={`${baseClass} text-indigo-500`} />;
    case 'achievement':
      return <Target className={`${baseClass} text-emerald-500`} />;
    case 'streak':
      return <Zap className={`${baseClass} text-amber-500`} />;
    case 'mastery':
      switch (tier) {
        case 'platinum':
          return <Trophy className={`${baseClass} text-blue-500`} />;
        case 'gold':
          return <Star className={`${baseClass} text-yellow-500`} />;
        case 'silver':
          return <Award className={`${baseClass} text-gray-400`} />;
        default:
          return <Shield className={`${baseClass} text-amber-600`} />;
      }
    default:
      return <Book className={`${baseClass} text-purple-500`} />;
  }
};

const BadgeCard = ({
  badge,
  progress,
  isNew,
}: {
  badge: Badge;
  progress?: UserProgress;
  isNew: boolean;
}) => {
  const percent =
    progress?.totalPoints && badge.requiredPoints
      ? Math.min(100, Math.round((progress.totalPoints / badge.requiredPoints) * 100))
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
      className={`group p-4 rounded-lg border relative cursor-pointer ${
        badge.earnedAt
          ? 'bg-primary/5 border-primary shadow-lg hover:shadow-xl hover:bg-primary/10'
          : 'bg-gray-50 border-gray-200 opacity-60 hover:opacity-80'
      }`}
    >
      <div className="flex items-start gap-3">
        <motion.div
          className="transition-transform duration-300"
          whileHover={{ rotate: 12, scale: 1.1 }}
        >
          {getTierIcon(badge.tier, badge.category)}
        </motion.div>
        <div className="flex-1">
          <h3 className="font-semibold group-hover:text-primary transition-colors">{badge.name}</h3>
          <p className="text-sm text-muted-foreground">{badge.description}</p>
          {badge.earnedAt && (
            <div className="mt-2 space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-xs text-primary font-medium">
                  Earned on {new Date(badge.earnedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="mt-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{badge.earnedAt ? '100%' : `${percent}%`}</span>
                </div>
                <div className="h-1.5 bg-primary/20 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: badge.earnedAt ? '100%' : `${percent}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        <AnimatePresence>
          {isNew && badge.earnedAt && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full"
            >
              New!
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export const Achievements = () => {
  const { toast } = useToast();
  const {
    data: progress,
    isLoading,
    error,
  } = useQuery<UserProgress>({
    queryKey: ['/api/users/progress/achievements'],
  });

  const notifyNewBadges = useCallback(() => {
    const newBadges = progress?.badges.filter(
      (badge) =>
        badge.earnedAt && new Date(badge.earnedAt).getTime() > Date.now() - 24 * 60 * 60 * 1000,
    );

    newBadges?.forEach((badge) => {
      toast({
        title: 'New Badge Earned!',
        description: `Congratulations! You've earned the "${badge.name}" badge!`,
        duration: 5000,
      });
    });
  }, [progress?.badges, toast]);

  useEffect(() => {
    notifyNewBadges();
  }, [progress?.badges, notifyNewBadges]);

  if (isLoading) {
    return (
      <Card className="w-full max-w-3xl mx-auto">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    toast({
      variant: 'destructive',
      title: 'Error',
      description: 'Failed to load achievements',
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

  const hasNewBadges = progress.badges.some(
    (badge) =>
      badge.earnedAt && new Date(badge.earnedAt).getTime() > Date.now() - 24 * 60 * 60 * 1000,
  );

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Your Learning Journey</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {/* Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Trophy className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold">Total Points</h3>
                <p className="text-2xl font-bold text-primary">{progress.totalPoints}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Zap className="h-8 w-8 mx-auto mb-2 text-amber-500" />
                <h3 className="font-semibold">Day Streak</h3>
                <p className="text-2xl font-bold text-amber-500">{progress.streakCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Brain className="h-8 w-8 mx-auto mb-2 text-indigo-500" />
                <h3 className="font-semibold">Current Level</h3>
                <p className="text-2xl font-bold text-indigo-500">{progress.level}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Overall Progress */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Level Progress</span>
            <span className="text-sm font-medium">{progress.totalPoints % 1000} / 1000 XP</span>
          </div>
          <Progress value={Math.min((progress.totalPoints % 1000) / 10, 100)} className="h-2" />
        </div>

        {/* Recent Achievements */}
        {progress.recentAchievements && progress.recentAchievements.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Recent Achievements</h3>
            <div className="space-y-2">
              {progress.recentAchievements.map((achievement, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-2 bg-secondary/10 rounded"
                >
                  <span>{achievement.topic}</span>
                  <span className="font-medium">{achievement.score}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Achievement Categories */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Achievement Categories</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {['learning', 'mastery', 'streak', 'achievement'].map((category) => {
              const categoryBadges = progress.badges.filter((b) => b.category === category);
              const earnedCount = categoryBadges.filter((b) => b.earnedAt).length;
              return (
                <Card key={category} className="p-4">
                  <div className="text-center">
                    {getTierIcon('gold', category)}
                    <h4 className="font-medium mt-2 capitalize">{category}</h4>
                    <p className="text-sm text-muted-foreground">
                      {earnedCount}/{categoryBadges.length}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Badges Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {progress.badges.map((badge) => (
            <BadgeCard
              key={badge.id}
              badge={badge}
              progress={progress}
              isNew={Boolean(
                badge.earnedAt &&
                  new Date(badge.earnedAt).getTime() > Date.now() - 24 * 60 * 60 * 1000,
              )}
            />
          ))}
        </div>

        {/* Next Achievement */}
        {progress.badges.length < 10 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-primary/5 rounded-lg"
          >
            <h3 className="font-semibold mb-2">Next Achievement</h3>
            <p className="text-sm text-muted-foreground">
              Complete more lessons and maintain a high accuracy rate to unlock more badges!
            </p>
            <div className="mt-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-muted-foreground">Accuracy</span>
                <span className="text-xs font-medium">{progress.accuracy}%</span>
              </div>
              <Progress value={progress.accuracy} className="h-1" />
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};

export default Achievements;
