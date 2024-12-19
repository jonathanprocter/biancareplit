export interface NCLEXQuestion {
  id?: number;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  difficulty: string;
  topic: string;
  tags: string[];
  insights?: string[];
}

export interface FlashcardContent {
  front: string;
  back: string;
  tags?: string[];
  difficulty?: string;
  lastReviewed?: Date;
  nextReview?: Date;
}

export interface StudySession {
  id?: number;
  startTime: Date;
  endTime?: Date;
  questionsAnswered: number;
  correctAnswers: number;
  topics: string[];
}

export interface SystemIntegration {
  initialize(): Promise<void>;
  createFlashcard(content: FlashcardContent): Promise<void>;
  loadFlashcards(): Promise<FlashcardContent[]>;
  saveProgress(sessionData: StudySession): Promise<void>;
}
