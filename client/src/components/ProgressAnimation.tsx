import { motion } from 'framer-motion';
import { Award, Star, Trophy } from 'lucide-react';

import React, { useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Milestone {
  id: number;
  title: string;
  description: string;
  requiredProgress: number;
  icon: 'trophy' | 'star' | 'award';
  achieved: boolean;
}

const milestones: Milestone[] = [
  {
    id: 1,
    title: 'Getting Started',
    description: 'Complete your first study session',
    requiredProgress: 20,
    icon: 'trophy',
    achieved: true,
  },
  {
    id: 2,
    title: 'Study Champion',
    description: 'Complete 5 study sessions',
    requiredProgress: 40,
    icon: 'star',
    achieved: false,
  },
  {
    id: 3,
    title: 'Learning Master',
    description: 'Master your first topic',
    requiredProgress: 80,
    icon: 'award',
    achieved: false,
  },
];

const IconComponent = ({ icon }: { icon: Milestone['icon'] }) => {
  switch (icon) {
    case 'trophy':
      return <Trophy className="h-6 w-6" />;
    case 'star':
      return <Star className="h-6 w-6" />;
    case 'award':
      return <Award className="h-6 w-6" />;
    default:
      return null;
  }
};

export const ProgressAnimation: React.FC = () => {
  const [currentProgress, setCurrentProgress] = useState(35);

  return (
    <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white overflow-hidden">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Learning Journey</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative pt-8 pb-4">
          <div className="absolute top-12 left-0 right-0 h-2 bg-white/20 rounded-full" />
          <motion.div
            className="absolute top-12 left-0 h-2 bg-white rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${currentProgress}%` }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
          <div className="relative flex justify-between">
            {milestones.map((milestone) => (
              <motion.div
                key={milestone.id}
                className={`absolute transition-all duration-300 ${
                  milestone.achieved ? 'text-yellow-300' : 'text-white/60'
                }`}
                style={{ left: `${milestone.requiredProgress}%` }}
                initial={{ scale: 0, y: 0 }}
                animate={{
                  scale: 1,
                  y: milestone.requiredProgress <= currentProgress ? -8 : 0,
                }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <div className="relative -left-3">
                  <IconComponent icon={milestone.icon} />
                </div>
              </motion.div>
            ))}
          </div>
          <div className="mt-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="text-center"
            >
              <p className="text-3xl font-bold mb-2">{currentProgress}%</p>
              <p className="text-sm opacity-80">Keep going! You're making great progress!</p>
            </motion.div>
            <div className="mt-6 space-y-3">
              {milestones.map((milestone) => (
                <motion.div
                  key={milestone.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1 + milestone.id * 0.1 }}
                  className={`flex items-center gap-3 ${
                    milestone.achieved ? 'text-yellow-300' : 'text-white/60'
                  }`}
                >
                  <IconComponent icon={milestone.icon} />
                  <div>
                    <p className="font-semibold">{milestone.title}</p>
                    <p className="text-sm opacity-80">{milestone.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
