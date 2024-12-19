import type { DateFormatOptions, FormattedDateResult } from '../types/dates';
export declare class DateFormatter {
    private static instance;
    private config;
    private constructor();
    static getInstance(): DateFormatter;
    formatDate(date: Date | string, options?: DateFormatOptions): FormattedDateResult;
}
export declare const dateFormatter: DateFormatter;
export declare const formatDate: (date: Date | string, options?: DateFormatOptions) => string;
