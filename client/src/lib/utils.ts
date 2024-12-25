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