import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines class names using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date to a human-readable string
 */
export function formatDate(input: string | number | Date): string {
  const date = new Date(input);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Calculate a confidence score from 0-100
 */
export function calculateConfidence(score: number): number {
  return Math.min(Math.max((score / 100) * 100, 0), 100);
}

/**
 * Format time spent in a readable format
 */
export function formatTimeSpent(startTime: number, endTime?: number): string {
  const duration = (endTime || Date.now()) - startTime;
  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}
