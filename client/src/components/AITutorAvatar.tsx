import { AnimatePresence, motion } from 'framer-motion';
import { Brain, Lightbulb, MessageCircle, Sparkles, Timer } from 'lucide-react';

import React, { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import { useToast } from '@/hooks/use-toast';

interface TutorMood {
  expression: string;
  color: string;
  message: string;
}

export const AITutorAvatar = () => {
  const [isTyping, setIsTyping] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [mood, setMood] = useState<TutorMood>({
    expression: '😊',
    color: 'bg-blue-500',
    message: "Hi! I'm your AI study companion. How can I help you today?",
  });
  const { toast } = useToast();

  const updateTutorMood = (progress: number) => {
    if (progress >= 80) {
      setMood({
        expression: '🌟',
        color: 'bg-green-500',
        message:
          "Outstanding progress! You're really mastering these concepts!",
      });
    } else if (progress >= 60) {
      setMood({
        expression: '😊',
        color: 'bg-blue-500',
        message: "You're doing great! Keep up the good work!",
      });
    } else {
      setMood({
        expression: '🤔',
        color: 'bg-yellow-500',
        message: "Let's work together to improve your understanding.",
      });
    }
  };

  const simulateResponse = async (query: string) => {
    setIsTyping(true);
    try {
      const response = await fetch('/api/ai-tutor/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) throw new Error('Failed to get AI response');

      const data = await response.json();
      setCurrentMessage(data.message);
      updateTutorMood(data.confidence || 70);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to get AI tutor response',
      });
    } finally {
      setIsTyping(false);
    }
  };

  const quickPrompts = [
    'Can you explain this concept?',
    'What should I study next?',
    'Review my progress',
    'Give me a practice question',
  ];

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <motion.div
            className={`w-16 h-16 rounded-full ${mood.color} flex items-center justify-center text-2xl`}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {mood.expression}
          </motion.div>

          <div className="flex-1">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Brain className="w-5 h-5" />
              AI Study Companion
            </h3>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentMessage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-2"
              >
                <p className="text-sm text-muted-foreground">
                  {isTyping ? (
                    <span className="flex items-center gap-2">
                      <Timer className="w-4 h-4 animate-spin" />
                      Thinking...
                    </span>
                  ) : (
                    mood.message
                  )}
                </p>
              </motion.div>
            </AnimatePresence>

            <div className="mt-4 flex flex-wrap gap-2">
              {quickPrompts.map((prompt, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => simulateResponse(prompt)}
                  className="flex items-center gap-2"
                >
                  <Lightbulb className="w-4 h-4" />
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Ask me anything about your studies!
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AITutorAvatar;
