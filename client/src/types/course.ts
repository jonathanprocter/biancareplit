import { MatchDetails } from './match';

export interface Course {
  id: number;
  title: string;
  description: string;
  category: string;
  prerequisites: number[];
  topics: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedHours: number;
  matchDetails?: MatchDetails;
  instructor?: {
    id: number;
    username: string;
  };
  recommendationScore?: number;
  estimatedTimeToComplete?: number;
  completed?: boolean;
}

export interface CourseWithProgress extends Course {
  progress: number;
  correctAnswers: number;
  totalAttempts: number;
}

export interface CourseEnrollment {
  id: number;
  course: CourseWithProgress;
  progress: number;
  correctAnswers: number;
  totalAttempts: number;
  completed?: boolean;
}
