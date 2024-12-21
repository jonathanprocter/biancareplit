import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, RefreshCw } from 'lucide-react';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  lastReviewed: Date | null;
  nextReview: Date | null;
  repetitionCount: number;
}

export function AIFlashcardGenerator() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('medium');
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const generateFlashcards = async () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a file to generate flashcards.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('difficulty', selectedDifficulty);

    try {
      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock response data
      const mockFlashcards = [
        {
          id: '1',
          front: 'What is the primary function of the cardiovascular system?',
          back: 'To transport oxygen, nutrients, and other essential substances throughout the body while removing waste products.',
          category: 'Physiological Integrity',
          difficulty: selectedDifficulty,
          lastReviewed: null,
          nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          repetitionCount: 0
        },
        // Add more mock flashcards as needed
      ];
      
      toast({
        title: "Success!",
        description: `Generated ${mockFlashcards.length} flashcards from your material.`,
      });
      
      // Schedule mock spaced repetition
      const schedule = mockFlashcards.map(card => ({
        ...card,
        nextReview: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000)
      }));
      
      console.log('Generated flashcards:', schedule);
      
    } catch (error) {
      console.error('Error generating flashcards:', error);
      toast({
        title: "Error",
        description: "Failed to generate flashcards. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const scheduleSpacedRepetition = async (flashcards: Flashcard[]) => {
    try {
      await fetch('/api/flashcards/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ flashcards }),
      });
    } catch (error) {
      console.error('Failed to schedule spaced repetition:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-6 w-6" />
          AI Flashcard Generator
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Input
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.txt"
              className="flex-1"
            />
            <Select
              value={selectedDifficulty}
              onValueChange={setSelectedDifficulty}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button
            onClick={generateFlashcards}
            disabled={isGenerating || !selectedFile}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Generating Flashcards...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Generate Flashcards
              </>
            )}
          </Button>

          <p className="text-sm text-gray-500 mt-4">
            Upload your study materials and our AI will generate smart flashcards with
            spaced repetition scheduling. Missed quiz questions will automatically be
            converted into flashcards.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
