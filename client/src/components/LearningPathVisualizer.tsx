import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Book, Brain, Target, Trophy, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateLearningPath } from '@/lib/openai-service';

interface Milestone {
  id: number;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  completed: boolean;
  aiRecommended: boolean;
  xpPoints: number;
}

interface CategoryProgress {
  category: string;
  progress: number;
  totalQuestions: number;
  correctAnswers: number;
}

export function LearningPathVisualizer() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [categoryProgress, setCategoryProgress] = useState<CategoryProgress[]>([]);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [xpPoints, setXpPoints] = useState(0);
  const [nextLevelXP, setNextLevelXP] = useState(100);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  console.log('LearningPathVisualizer: Component mounted');

  useEffect(() => {
    console.log('LearningPathVisualizer: Component initialized');
    
    const fetchData = async () => {
      console.log('LearningPathVisualizer: Starting data fetch');
      setIsLoading(true);
      setError(null);

      try {
        const context = {
          currentTopic: 'Fundamentals of Nursing',
          recentPerformance: 75,
          strugglingAreas: ['Pharmacology', 'Critical Care'],
          learningStyle: 'Visual'
        };

        console.log('LearningPathVisualizer: Calling generateLearningPath with context:', context);
        
        // First set some default milestones while waiting for AI response
        const defaultMilestones: Milestone[] = [
          {
            id: 1,
            title: 'Loading your personalized path...',
            description: 'Please wait while we analyze your learning profile',
            category: 'General',
            difficulty: 'beginner',
            completed: false,
            aiRecommended: true,
            xpPoints: 100
          }
        ];

        setMilestones(defaultMilestones);
        
        const { milestones: aiMilestones, categoryProgress: aiCategoryProgress } = 
          await generateLearningPath(context);

        console.log('LearningPathVisualizer: Received AI response:', { aiMilestones, aiCategoryProgress });

        if (!Array.isArray(aiMilestones)) {
          throw new Error('Invalid milestones format received');
        }

        const mappedMilestones = aiMilestones.map((milestone, index) => ({
          id: index + 1,
          ...milestone,
          completed: false
        }));

        setMilestones(mappedMilestones);
        setCategoryProgress(aiCategoryProgress);
        console.log('LearningPathVisualizer: Data loaded successfully');
      } catch (err) {
        console.error('LearningPathVisualizer: Error loading data', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load learning path data';
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });

        // Set fallback data in case of error
        const fallbackMilestones: Milestone[] = [
          {
            id: 1,
            title: 'Getting Started',
            description: 'Begin with foundational concepts',
            category: 'Fundamentals',
            difficulty: 'beginner',
            completed: false,
            aiRecommended: true,
            xpPoints: 100
          }
        ];
        
        setMilestones(fallbackMilestones);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const renderIcon = (difficulty: Milestone['difficulty']) => {
    switch (difficulty) {
      case 'beginner':
        return <Book className="h-6 w-6 text-blue-500" />;
      case 'intermediate':
        return <Brain className="h-6 w-6 text-purple-500" />;
      case 'advanced':
        return <Target className="h-6 w-6 text-red-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-destructive/10">
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Learning Path</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{error}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {error.includes('OpenAI') 
              ? 'Please ensure the OpenAI API key is properly configured.'
              : 'Please try refreshing the page or contact support if the issue persists.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Level Progress */}
      <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-6 w-6" />
            Learning Journey Level {currentLevel}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>XP: {xpPoints}/{nextLevelXP}</span>
              <Badge variant="secondary">Level {currentLevel}</Badge>
            </div>
            <Progress value={(xpPoints / nextLevelXP) * 100} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Milestones */}
      <div className="grid gap-4">
        {milestones.map((milestone) => (
          <motion.div
            key={milestone.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className={`transition-all ${milestone.completed ? 'bg-green-50' : ''}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    {renderIcon(milestone.difficulty)}
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        {milestone.title}
                        {milestone.aiRecommended && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            AI Recommended
                          </Badge>
                        )}
                      </h3>
                      <p className="text-sm text-gray-500">{milestone.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={milestone.completed ? 'success' : 'secondary'}>
                      {milestone.completed ? 'Completed' : `+${milestone.xpPoints} XP`}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Category Progress */}
      <Card>
        <CardHeader>
          <CardTitle>NCLEX Category Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {categoryProgress.map((category) => (
              <div key={category.category} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{category.category}</span>
                  <span className="text-gray-500">
                    {category.correctAnswers}/{category.totalQuestions} Questions
                  </span>
                </div>
                <Progress value={category.progress} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
