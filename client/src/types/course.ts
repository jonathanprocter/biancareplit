export interface MatchDetails {
  topicMatch: number;
  timeMatch: number;
  difficultyMatch: number;
  learningPace: number;
  progressive?: number;
}

export interface Course {
  id: number;
  title: string;
  description: string;
  category?: string;
  prerequisites?: number[];
  topics?: string[];
  matchDetails?: MatchDetails;
  completed?: boolean;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  estimatedHours?: number;
  instructor?: {
    id: number;
    username: string;
  };
  recommendationScore?: number;
  difficultyLevel?: string;
  estimatedTimeToComplete?: number;
}

export type CourseWithProgress = {
  course: Course;
  progress: number;
  correctAnswers: number;
  totalAttempts: number;
};
