import { ReactNode } from 'react';

export interface Config {
  version: string;
  environment: string;
  features: Record<string, boolean>;
}

export interface MiddlewareContext {
  timestamp: string;
  requestId: string;
  environment: string;
  config: Config;
}

export interface InitializationState {
  configLoaded: boolean;
  analyticsInitialized: boolean;
  studyMaterialInitialized: boolean;
  initialized: boolean;
  error?: string;
}

export interface FlashcardSystem {
  initialize(): Promise<FlashcardSystem>;
  initializeAnalytics(): Promise<boolean>;
  getInitializationState(): InitializationState;
  getInitializationError(): Error | null;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  difficulty: 'easy' | 'medium' | 'hard';
  keywords: string[];
  createdAt: string;
  lastReviewed: string | null;
  reviewCount: number;
  easiness: number;
  interval: number;
  nextReview: string | null;
}

export interface FlashcardContextType {
  flashcards: Flashcard[];
  setFlashcards: (cards: Flashcard[]) => void;
}

export interface QuestionBankContextType {
  questionBank: any;
  setQuestionBank: (bank: any) => void;
}

export interface StudySession {
  id: string;
  type: string;
  startTime: number;
  endTime: number | null;
  completed: boolean;
  results: StudyResult[];
}

export interface StudyResult {
  timestamp: string;
  correct: boolean;
  timeSpent: number;
  confidence: number;
  questionId: string;
}

export interface FlashcardManagerProps {
  rootElement: HTMLElement;
}
