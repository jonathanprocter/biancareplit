import type { DateFormatOptions, FormattedDateResult } from '../types/dates';
/**
 * DateFormatter singleton class for consistent date formatting across the application
 */
declare class DateFormatter {
    private static instance;
    private defaultFormat;
    private timeFormat;
    private defaultLocale;
    private timezone;
    private constructor();
    static getInstance(): DateFormatter;
    formatDate(date: Date | string, options?: DateFormatOptions): FormattedDateResult;
    setDefaultFormat(format: string): void;
    setTimeFormat(format: string): void;
    setDefaultLocale(locale: string): void;
    setTimezone(timezone: string): void;
}
export declare const dateFormatter: DateFormatter;
/**
 * Utility function for direct date formatting
 */
export declare function formatDate(date: Date | string, options?: DateFormatOptions): string;
/**
 * Export commonly used formatters
 */
export declare const formatDateWithTime: (date: Date | string) => string;
export declare const formatRelativeDate: (date: Date | string) => string;
export { DateFormatOptions, FormattedDateResult };
