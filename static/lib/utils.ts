import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface DifficultyLevel {
  id: string;
  name: string;
  value: number;
}

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

export const isDifficultyLevel = (value: any): value is DifficultyLevel => {
  return (
    value &&
    typeof value === 'object' &&
    'id' in value &&
    'name' in value &&
    'value' in value
  );
};

export const calculateConfidence = (score: number): number => {
  return Math.min(Math.max((score / 100) * 100, 0), 100);
};

export const calculateTimeSpent = (startTime: number): string => {
  return `${Math.round((Date.now() - startTime) / 1000)}s`;
};

export const formatDate = (
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string => {
  const dateFormatter = new Intl.DateTimeFormat('en-US', options); //Using Intl.DateTimeFormat for better browser support.
  return dateFormatter.format(typeof date === 'string' ? new Date(date) : date);
};

export const DifficultyLevel = {
  BEGINNER: { id: 'beginner', name: 'Beginner', value: 1 },
  INTERMEDIATE: { id: 'intermediate', name: 'Intermediate', value: 2 },
  ADVANCED: { id: 'advanced', name: 'Advanced', value: 3 },
} as const;

export type DifficultyLevel =
  (typeof DifficultyLevel)[keyof typeof DifficultyLevel];
