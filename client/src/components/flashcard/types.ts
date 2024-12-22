export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  category: string;
  difficulty: Difficulty;
  lastReviewed: Date | null;
  nextReview: Date | null;
  repetitionCount: number;
}

export interface FlashcardGenerationStatus {
  isGenerating: boolean;
  error?: string;
  success?: boolean;
}
