import { useState, useEffect, useRef } from 'react';
import { getMentorResponse } from '@/lib/openai-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Bot, Send, Loader2, BookOpen, Brain, Target } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface MentorContext {
  currentTopic?: string;
  recentPerformance?: number;
  strugglingAreas?: string[];
  learningStyle?: string;
}

export function AIMentor() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mentorContext, setMentorContext] = useState<MentorContext>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize context from user's learning data
    const fetchContext = async () => {
      try {
        // This will be replaced with actual API call
        const mockContext = {
          currentTopic: 'Cardiovascular System',
          recentPerformance: 85,
          strugglingAreas: ['Pharmacology', 'Critical Care'],
          learningStyle: 'Visual'
        };
        setMentorContext(mockContext);
        
        // Add initial greeting
        setMessages([{
          role: 'assistant',
          content: `Hello! I'm your AI learning mentor. I see you're studying ${mockContext.currentTopic}. How can I help you today?`,
          timestamp: new Date()
        }]);
      } catch (error) {
        console.error('Error fetching mentor context:', error);
      }
    };

    fetchContext();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    try {
      setIsLoading(true);
      const userMessage = { role: 'user' as const, content: input, timestamp: new Date() };
      setMessages(prev => [...prev, userMessage]);
      setInput('');

      const { content, error } = await getMentorResponse(
        messages.map(({ role, content }) => ({ role, content })),
        mentorContext
      );

      if (error) {
        toast({
          title: "Error",
          description: error,
          variant: "destructive"
        });
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to get response from AI mentor. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-6 w-6" />
          AI Learning Mentor
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="flex gap-4 mb-4">
          <Card className="flex-1 p-4 bg-muted/50">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="text-sm font-medium">
                Current Topic: {mentorContext.currentTopic}
              </span>
            </div>
          </Card>
          <Card className="flex-1 p-4 bg-muted/50">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span className="text-sm font-medium">
                Performance: {mentorContext.recentPerformance}%
              </span>
            </div>
          </Card>
        </div>

        <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <span className="text-xs opacity-70">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex gap-2 mt-4">
          <Input
            placeholder="Ask your AI mentor..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            disabled={isLoading}
          />
          <Button onClick={sendMessage} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}