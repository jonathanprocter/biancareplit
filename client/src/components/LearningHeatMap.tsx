import { AnimatePresence, motion } from 'framer-motion';
import { Award, Brain, Calendar, Sparkles } from 'lucide-react';

import React, { useEffect, useState } from 'react';

import { Card, CardContent } from '@/components/ui/card';

import { useToast } from '@/hooks/use-toast';

interface ActivityData {
  date: Date;
  intensity: number;
  achievements: string[];
}

export const LearningHeatMap = () => {
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [selectedCell, setSelectedCell] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/learning-activities');
        if (!response.ok) throw new Error('Failed to fetch activities');
        const data = await response.json();
        setActivities(data.map((activity: any) => ({ ...activity, date: new Date(activity.date) })));
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load learning activities',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [toast]);

  const getIntensityColor = (intensity: number) => {
    const baseColor = '79, 70, 229'; // RGB parts of Indigo
    const opacity = Math.min(intensity * 0.7, 0.7);
    return `rgba(${baseColor}, ${opacity})`;
  };

  const renderHeatMap = () => {
    const today = new Date();
    const cells = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const activity = activities.find(
        (a) => a.date.toDateString() === date.toDateString(),
      );

      return (
        <motion.div
          key={date.toISOString()}
          whileHover={{ scale: 1.2 }}
          onClick={() => setSelectedCell(activity || null)}
          className={`
            w-8 h-8 rounded-md cursor-pointer
            flex items-center justify-center
            transition-colors duration-200
          `}
          style={{
            backgroundColor: activity
              ? getIntensityColor(activity.intensity)
              : 'rgb(243, 244, 246)',
          }}
        >
          {activity?.achievements.length > 0 && <Sparkles className="w-4 h-4 text-white" />}
        </motion.div>
      );
    });

    return <div className="grid grid-cols-7 gap-2">{cells}</div>;
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Learning Activity Heat Map
          </h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-1">
              {[0.2, 0.4, 0.6, 0.8].map((intensity) => (
                <div
                  key={intensity}
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: getIntensityColor(intensity) }}
                />
              ))}
            </div>
            <span>More</span>
          </div>
        </div>

        {loading ? (<p>Loading...</p>) : renderHeatMap()}

        <AnimatePresence>
          {selectedCell && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mt-4 p-4 bg-primary/5 rounded-lg"
            >
              <div className="flex items-start gap-3">
                <Brain className="w-5 h-5 text-primary" />
                <div>
                  <h4 className="font-medium">
                    {selectedCell.date.toLocaleDateString()}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Learning Intensity: {Math.round(selectedCell.intensity * 100)}%
                  </p>
                  {selectedCell.achievements.length > 0 && (
                    <div className="mt-2">
                      <h5 className="text-sm font-medium flex items-center gap-2">
                        <Award className="w-4 h-4" />
                        Achievements
                      </h5>
                      <ul className="mt-1 text-sm text-muted-foreground">
                        {selectedCell.achievements.map((achievement) => (
                          <li key={achievement}>{achievement}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

export default LearningHeatMap; 