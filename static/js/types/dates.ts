/**
 * Date formatting type definitions for the NCLEX coaching platform
 */
import { Locale } from 'date-fns';

export const DifficultyLevel = {
  Beginner: 'beginner',
  Intermediate: 'intermediate',
  Advanced: 'advanced',
  Expert: 'expert',
  Easy: 'easy',
  Medium: 'medium',
  Hard: 'hard'
} as const;

export type DifficultyLevel = typeof DifficultyLevel[keyof typeof DifficultyLevel];

export interface DateFormatOptions {
  format?: string;
  includeTime?: boolean;
  locale?: Pick<Locale, 'code' | 'formatLong' | 'localize' | 'match' | 'options'>;
  timeZone?: string;
  relative?: boolean;
}

export interface FormattedDateResult {
  formatted: string;
  valid: boolean;
  date: Date | null;
  timestamp?: number;
  relative?: string;
  timeZone?: string;
}

export interface DateFormatConfig {
  defaultTimeZone: string;
  defaultFormat: string;
  defaultTimeFormat: string;
  defaultLocale?: Locale;
  formats?: {
    [key: string]: Intl.DateTimeFormatOptions;
  };
}

// Helper function to create FormattedDateResult with required date property
export const createFormattedDateResult = (
  formatted: string,
  valid: boolean,
  date: Date | null,
  timestamp?: number,
  relative?: string
): FormattedDateResult => ({
  formatted,
  valid,
  date: date || null,
  timestamp,
  relative,
});

// Helper function to create invalid date result
export const createInvalidDateResult = (formatted: string): FormattedDateResult => ({
  formatted,
  valid: false,
  date: null,
  timestamp: undefined,
  relative: undefined,
});

export interface DateDisplayProps {
  date: Date | string;
  options?: DateFormatOptions;
  className?: string;
  fallback?: string;
  showRelative?: boolean;
}

// Constants
export const DEFAULT_DATE_FORMAT = 'PPP';
export const DEFAULT_TIME_FORMAT = 'p';
export const DEFAULT_DATETIME_FORMAT = `${DEFAULT_DATE_FORMAT} ${DEFAULT_TIME_FORMAT}`;

// Component variants
export type ButtonVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success';
export type BadgeVariant = ButtonVariant;
export type BadgeDisplayVariant = BadgeVariant | null | undefined;

// Configuration types
export interface DateFormatterConfig {
  defaultTimeZone: string;
  defaultFormat?: string;
  defaultTimeFormat?: string;
  defaultLocale?: Pick<Locale, 'code' | 'formatLong' | 'localize' | 'match' | 'options'>;
  formats?: {
    [key: string]: Intl.DateTimeFormatOptions;
  };
}

export const isDifficultyLevel = (value: unknown): value is DifficultyLevel => {
  return typeof value === 'string' && Object.values(DifficultyLevel).includes(value as DifficultyLevel);
};

// Type guard for checking if a value is a valid locale
export const isLocale = (value: unknown): value is Locale => {
  return typeof value === 'object' && value !== null && 'code' in value;
};

// Re-export using proper syntax for isolatedModules
export type { Locale } from 'date-fns';