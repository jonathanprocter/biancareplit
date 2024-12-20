import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistance, parseISO, isValid } from 'date-fns';
import type {
  DateFormatOptions,
  FormattedDateResult,
  DifficultyLevel,
  DateFormatterConfig,
} from '../types/dates';
import {
  DEFAULT_DATE_FORMAT,
  DEFAULT_TIME_FORMAT,
  DEFAULT_DATETIME_FORMAT,
  isDifficultyLevel,
  createFormattedDateResult,
  createInvalidDateResult,
} from '../types/dates';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string, options: DateFormatOptions = {}): string {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;

  if (!isValid(parsedDate)) {
    return 'Invalid date';
  }

  const {
    format: dateFormat = DEFAULT_DATE_FORMAT,
    includeTime = false,
    locale,
    timeZone,
    relative = false,
  } = options;

  try {
    if (relative) {
      return formatDistance(parsedDate, new Date(), { addSuffix: true });
    }

    const formatStr = includeTime ? DEFAULT_DATETIME_FORMAT : dateFormat;
    return format(parsedDate, formatStr, {
      locale,
      ...(timeZone && { timeZone }),
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}

export function getFormattedDate(
  date: Date | string,
  options: DateFormatOptions = {},
): FormattedDateResult {
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;

    if (!isValid(parsedDate)) {
      return createInvalidDateResult('Invalid date');
    }

    return createFormattedDateResult(
      formatDate(parsedDate, options),
      true,
      parsedDate,
      parsedDate.getTime(),
      options.relative ? formatDate(parsedDate, { relative: true }) : undefined,
    );
  } catch (error) {
    console.error('Error in getFormattedDate:', error);
    return createInvalidDateResult('Invalid date');
  }
}

export function getRelativeTime(date: Date | string): string {
  return formatDate(date, { relative: true });
}

export function formatDateWithTime(date: Date | string): string {
  return formatDate(date, { includeTime: true });
}

export function calculateTimeSpent(startTime: number): number {
  return Math.floor((Date.now() - startTime) / 1000);
}

export function calculateConfidence(
  timeSpent: number,
  isCorrect: boolean,
  difficulty: DifficultyLevel,
): number {
  let baseConfidence = isCorrect ? 4 : 2;

  // Adjust based on time spent
  if (timeSpent < 30) baseConfidence += 1;
  else if (timeSpent > 120) baseConfidence -= 1;

  // Adjust based on difficulty
  if (difficulty === 'advanced' || difficulty === 'hard') baseConfidence -= 1;
  else if (difficulty === 'beginner' || difficulty === 'easy') baseConfidence += 1;

  // Ensure confidence is between 1-5
  return Math.max(1, Math.min(5, baseConfidence));
}

// Re-export everything from dates module
export { isDifficultyLevel, DEFAULT_DATE_FORMAT, DEFAULT_TIME_FORMAT, DEFAULT_DATETIME_FORMAT };

export type { DateFormatOptions, FormattedDateResult, DifficultyLevel, DateFormatterConfig };
