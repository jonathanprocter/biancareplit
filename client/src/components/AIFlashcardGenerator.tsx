import { RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DifficultySelector } from '@/components/flashcard/DifficultySelector';
import { FileUploadInput } from '@/components/flashcard/FileUploadInput';
import { FlashcardGenerationButton } from '@/components/flashcard/FlashcardGenerationButton';
import { useFlashcardGeneration } from '@/components/flashcard/useFlashcardGeneration';
import React from 'react';

export const AIFlashcardGenerator: React.FC = () => {
  const {
    selectedFile,
    setSelectedFile,
    isGenerating,
    selectedDifficulty,
    setSelectedDifficulty,
    generateFlashcards,
  } = useFlashcardGeneration();

  // Add feedback mechanism for guiding user actions
  const isButtonDisabled = !selectedFile || isGenerating;

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
            <FileUploadInput onFileChange={setSelectedFile} disabled={isGenerating} />
            <DifficultySelector
              value={selectedDifficulty}
              onValueChange={setSelectedDifficulty}
              disabled={isGenerating}
            />
          </div>

          <FlashcardGenerationButton
            onClick={generateFlashcards}
            isGenerating={isGenerating}
            disabled={isButtonDisabled}
          />

          <p className="text-sm text-gray-500 mt-4">
            Upload your study materials and our AI will generate smart flashcards with spaced
            repetition scheduling. Missed quiz questions will automatically be converted into
            flashcards.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
