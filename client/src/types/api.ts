export interface AIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  topic: string;
  difficulty: string;
}

export interface Flashcard {
  front: string;
  back: string;
  topic: string;
  category: string;
}
