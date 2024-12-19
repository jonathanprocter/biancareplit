import { ReactNode } from 'react';

export interface NCLEXQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface StudyCoachProps {
  question: NCLEXQuestion | null;
  onAnswer: (answer: string) => void;
  onNext: () => void;
}

export interface QuestionDisplayProps {
  question: NCLEXQuestion;
  children?: ReactNode;
}
