import { useState } from 'react';

import { useToast } from '@/hooks/use-toast';

import type { Difficulty, Flashcard } from './types';

export function useFlashcardGeneration() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium');
  const { toast } = useToast();

  const generateFlashcards = async (): Promise<Flashcard[] | null> => {
    if (!selectedFile) {
      toast({
        title: 'No File Selected',
        description: 'Please select a file to generate flashcards.',
        variant: 'destructive',
      });
      return null;
    }

    setIsGenerating(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('difficulty', selectedDifficulty);

    try {
      const response = await fetch('/api/flashcards/generate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to generate flashcards');
      }

      const flashcards: Flashcard[] = await response.json();

      toast({
        title: 'Success!',
        description: `Generated ${flashcards.length} flashcards from your material.`,
      });

      return flashcards;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate flashcards. Please try again.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    selectedFile,
    setSelectedFile,
    isGenerating,
    selectedDifficulty,
    setSelectedDifficulty,
    generateFlashcards,
  };
}
