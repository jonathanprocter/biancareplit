import { RefreshCw, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface FlashcardGenerationButtonProps {
  onClick: () => void;
  isGenerating: boolean;
  disabled: boolean;
}

export function FlashcardGenerationButton({
  onClick,
  isGenerating,
  disabled,
}: FlashcardGenerationButtonProps) {
  return (
    <Button onClick={onClick} disabled={disabled || isGenerating} className="w-full">
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
  );
}