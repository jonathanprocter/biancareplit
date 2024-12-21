import { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Question {
  id: number;
  question: string;
  category: string;
}

interface QuizResponse {
  questionId: number;
  response: number;
}

export function LearningStyleQuiz() {
  const [responses, setResponses] = useState<QuizResponse[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const fetchQuestions = async () => {
    const res = await fetch('/api/learning-style/questions');
    if (!res.ok) throw new Error('Failed to fetch questions');
    return res.json();
  };

  const { data: questions, isLoading, error } = useQuery<Question[]>({
    queryKey: ['questions'],
    queryFn: fetchQuestions
  });

  const submitQuiz = useMutation({
    mutationFn: async (responses: QuizResponse[]) => {
      const res = await fetch('/api/learning-style/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses }),
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      return res.json();
    },
    onSuccess: ({ learningStyle }) => {
      toast({
        title: 'Quiz Completed!',
        description: `Your primary learning style is: ${learningStyle}`,
      });
      setLocation('/dashboard');
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to submit quiz',
        description: error instanceof Error ? error.message : 'Please try again',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <p>Error loading questions: {error.message}</p>;
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No questions available at the moment.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQ = questions[currentQuestion] || {};
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  const handleResponse = (value: string) => {
    const response = {
      questionId: currentQ.id,
      response: parseInt(value, 10),
    };

    setResponses((prev) => {
      const existing = prev.findIndex((r) => r.questionId === response.questionId);
      if (existing !== -1) {
        const newResponses = [...prev];
        newResponses[existing] = response;
        return newResponses;
      }
      return [...prev, response];
    });

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    }
  };

  const handleSubmit = () => {
    if (responses.length !== questions.length) {
      toast({
        variant: 'destructive',
        title: 'Please answer all questions',
        description: 'Some questions are still unanswered.',
      });
      return;
    }

    submitQuiz.mutate(responses);
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Learning Style Assessment</CardTitle>
          <Progress value={progress} className="mt-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div key={currentQ.id} className="space-y-4">
            <p className="text-lg font-medium">{currentQ.question}</p>
            <RadioGroup
              onValueChange={handleResponse}
              value={responses.find((r) => r.questionId === currentQ.id)?.response?.toString() || ''}
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <div key={value} className="flex items-center space-x-2">
                  <RadioGroupItem value={value.toString()} id={`rating-${value}`} />
                  <Label htmlFor={`rating-${value}`}>
                    {value === 1
                      ? 'Strongly Disagree'
                      : value === 2
                      ? 'Disagree'
                      : value === 3
                      ? 'Neutral'
                      : value === 4
                      ? 'Agree'
                      : 'Strongly Agree'}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestion((prev) => Math.max(0, prev - 1))}
              disabled={currentQuestion === 0}
            >
              Previous
            </Button>
            {currentQuestion === questions.length - 1 ? (
              <Button onClick={handleSubmit} disabled={submitQuiz.isPending}>
                {submitQuiz.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Quiz'
                )}
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentQuestion((prev) => prev + 1)}
                disabled={!responses.find((r) => r.questionId === currentQ.id)}
              >
                Next
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
