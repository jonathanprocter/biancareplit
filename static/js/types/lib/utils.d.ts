import { type ClassValue } from 'clsx';
import type {
  DateFormatOptions,
  FormattedDateResult,
  DifficultyLevel,
  DateFormatterConfig,
} from '../js/types/dates';
import {
  DEFAULT_DATE_FORMAT,
  DEFAULT_TIME_FORMAT,
  DEFAULT_DATETIME_FORMAT,
  isDifficultyLevel,
} from '../js/types/dates';
export declare function cn(...inputs: ClassValue[]): string;
export declare function formatDate(date: Date | string, options?: DateFormatOptions): string;
export declare function getFormattedDate(
  date: Date | string,
  options?: DateFormatOptions
): FormattedDateResult;
export declare function getRelativeTime(date: Date | string): string;
export declare function formatDateWithTime(date: Date | string): string;
export declare function calculateTimeSpent(startTime: number): number;
export declare function calculateConfidence(
  timeSpent: number,
  isCorrect: boolean,
  difficulty: DifficultyLevel
): number;
export { isDifficultyLevel, DEFAULT_DATE_FORMAT, DEFAULT_TIME_FORMAT, DEFAULT_DATETIME_FORMAT };
export type { DateFormatOptions, FormattedDateResult, DifficultyLevel, DateFormatterConfig };
