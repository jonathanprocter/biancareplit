import { Locale } from 'date-fns';

export interface FormattedDateResult {
  formatted: string;
  valid: boolean;
  date: Date | null;
  timestamp?: number;
  relative?: string;
}

export interface DateFormatOptions {
  format?: string;
  includeTime?: boolean;
  locale?: Locale;
  timeZone?: string;
  relative?: boolean;
}

export interface DateFormatterConfig {
  defaultTimeZone: string;
  defaultFormat?: string;
  defaultTimeFormat?: string;
  defaultLocale?: Locale;
  formats?: {
    [key: string]: Intl.DateTimeFormatOptions;
  };
}

export type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary';

export interface DateDisplayProps {
  date: Date | string;
  options?: DateFormatOptions;
  className?: string;
  fallback?: string;
  showRelative?: boolean;
}

// Define difficulty levels
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export const isDifficultyLevel = (value: unknown): value is DifficultyLevel => {
  return typeof value === 'string' && ['beginner', 'intermediate', 'advanced'].includes(value);
};

// Re-export for convenience
export type { Locale };
