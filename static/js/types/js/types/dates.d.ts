/**
 * Date formatting type definitions for the NCLEX coaching platform
 */
import { Locale } from 'date-fns';
export interface DateFormatOptions {
    format?: string;
    includeTime?: boolean;
    locale?: Locale;
    timeZone?: string;
    relative?: boolean;
}
export interface FormattedDateResult {
    formatted: string;
    valid: boolean;
    timestamp?: number;
    relative?: string;
}
export interface DateDisplayProps {
    date: Date | string;
    options?: DateFormatOptions;
    className?: string;
    fallback?: string;
    showRelative?: boolean;
}
export declare const DEFAULT_DATE_FORMAT = "PPP";
export declare const DEFAULT_TIME_FORMAT = "p";
export declare const DEFAULT_DATETIME_FORMAT = "PPP p";
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'easy' | 'medium' | 'hard';
export declare function isDifficultyLevel(value: unknown): value is DifficultyLevel;
export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success';
export interface DateFormatterConfig {
    defaultFormat: string;
    defaultTimeFormat: string;
    defaultTimeZone?: string;
}
export * from 'date-fns';
