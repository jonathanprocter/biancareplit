import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, Upload, Bot, Trophy, Activity } from 'lucide-react';

const DailyWelcomeCard = () => {
  const [greeting, setGreeting] = useState('');
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const hour = time.getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [time]);

  return (
    <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">{greeting}!</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <Calendar className="h-5 w-5" />
          <p>{time.toLocaleDateString()}</p>
          <Clock className="h-5 w-5 ml-4" />
          <p>{time.toLocaleTimeString()}</p>
        </div>
        <p className="mt-4">Your learning journey continues. Let's achieve something great today!</p>
      </CardContent>
    </Card>
  );
};

const AITutorAvatar = () => {
  const { toast } = useToast();
  const [isTyping, setIsTyping] = useState(false);

  const handleAskQuestion = () => {
    setIsTyping(true);
    toast({
      title: "AI Tutor",
      description: "I'm here to help! What would you like to learn about?",
    });
    setTimeout(() => setIsTyping(false), 1000);
  };

  return (
    <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-6 w-6" />
          AI Tutor
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4">Your personal AI tutor is ready to assist you with any questions.</p>
        <Button 
          onClick={handleAskQuestion}
          variant="secondary"
          className="w-full"
          disabled={isTyping}
        >
          {isTyping ? 'Thinking...' : 'Ask a Question'}
        </Button>
      </CardContent>
    </Card>
  );
};

const StudyTimer = () => {
  const [time, setTime] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive) {
      interval = setInterval(() => {
        setTime(t => t + 1);
      }, 1000);
    } else if (!isActive && time !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, time]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-6 w-6" />
          Study Timer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-mono text-center mb-4">{formatTime(time)}</div>
        <Button 
          onClick={() => setIsActive(!isActive)}
          variant="secondary"
          className="w-full"
        >
          {isActive ? 'Pause' : 'Start'} Study Session
        </Button>
      </CardContent>
    </Card>
  );
};

const LearningHeatMap = () => {
  const [progress, setProgress] = useState(45);

  return (
    <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-6 w-6" />
          Learning Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Progress value={progress} className="h-2 bg-orange-300" />
          <p>You're making great progress! {progress}% of your daily goal completed.</p>
        </div>
      </CardContent>
    </Card>
  );
};

const Achievements = () => {
  const achievements = [
    { title: 'First Login', completed: true },
    { title: '1 Hour Study Streak', completed: true },
    { title: 'Complete First Quiz', completed: false },
  ];

  return (
    <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-6 w-6" />
          Achievements
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {achievements.map(({ title, completed }) => (
            <div key={title} className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${completed ? 'bg-white' : 'bg-yellow-300'}`} />
              <span>{title}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const FileUploadWizard = () => {
  const { toast } = useToast();
  
  const handleUpload = () => {
    toast({
      title: "Upload Started",
      description: "Your study materials are being processed...",
    });
  };

  return (
    <Card className="bg-gradient-to-r from-pink-500 to-pink-600 text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-6 w-6" />
          Upload Study Materials
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4">Upload your study materials for AI-powered analysis and flashcard generation.</p>
        <Button 
          onClick={handleUpload}
          variant="secondary"
          className="w-full"
        >
          Select Files to Upload
        </Button>
      </CardContent>
    </Card>
  );
};

import { ProgressAnimation } from '@/components/ProgressAnimation';
import { AnalyticsVisualizer } from '@/components/AnalyticsVisualizer';
import { AIFlashcardGenerator } from '@/components/AIFlashcardGenerator';
import { AIMentor } from '@/components/AIMentor';
import { LearningPathVisualizer } from '@/components/LearningPathVisualizer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function Dashboard() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <DailyWelcomeCard />
      
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="learning-path">Learning Path</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="study-tools">Study Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-8">
              <AITutorAvatar />
              <StudyTimer />
            </div>
            <div className="space-y-8">
              <LearningHeatMap />
              <Achievements />
            </div>
          </div>
          <ProgressAnimation />
        </TabsContent>

        <TabsContent value="learning-path">
          <div className="space-y-8">
            <LearningPathVisualizer />
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="space-y-8">
            <AnalyticsVisualizer />
          </div>
        </TabsContent>

        <TabsContent value="study-tools">
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <AIFlashcardGenerator />
              <AIMentor />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
