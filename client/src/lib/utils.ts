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

export function calculateConfidence(score: number): number {
  return Math.min(Math.max((score / 100) * 100, 0), 100);
}

export function calculateTimeSpent(startTime: number): string {
  return `${Math.round((Date.now() - startTime) / 1000)}s`;
}

// Add utility functions
export function formatTimeSpent(startTime: number, endTime?: number): string {
  const duration = (endTime || Date.now()) - startTime;
  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

export function calculateProgress(completed: number, total: number, accuracy: number = 0): number {
  const completionWeight = 0.7;
  const accuracyWeight = 0.3;

  const completionProgress = Math.min((completed / total) * 100, 100);
  const weightedProgress = completionProgress * completionWeight + accuracy * 100 * accuracyWeight;

  return Math.min(Math.round(weightedProgress), 100);
}
