import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
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
 * Format a duration in milliseconds to a human-readable string
 */
export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/**
 * Safely parse a number, returning 0 if invalid
 */
export function safeParseNumber(value: unknown): number {
  const parsed = Number(value);
  return isNaN(parsed) ? 0 : parsed;
}
