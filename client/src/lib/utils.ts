import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(input: string | number | Date): string {
  const date = new Date(input);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

export function sanitizeMedicalData<T extends Record<string, unknown>>(data: T): T {
  return Object.entries(data).reduce((acc, [key, value]) => {
    if (typeof value === 'string') {
      acc[key] = value.replace(/<[^>]*>/g, '').trim() as unknown as T[keyof T];
    } else {
      acc[key] = value as T[keyof T];
    }
    return acc;
  }, {} as T);
}

export interface DifficultyLevel {
  id: string;
  name: string;
  value: number;
}

export const DIFFICULTY_LEVELS = {
  BEGINNER: { id: 'beginner', name: 'Beginner', value: 1 },
  INTERMEDIATE: { id: 'intermediate', name: 'Intermediate', value: 2 },
  ADVANCED: { id: 'advanced', name: 'Advanced', value: 3 },
} as const;

export function calculateConfidence(score: number): number {
  return Math.min(Math.max((score / 100) * 100, 0), 100);
}

export function calculateTimeSpent(startTime: number): string {
  return `${Math.round((Date.now() - startTime) / 1000)}s`;
}