
import { format, parseISO } from 'date-fns'

export interface DateFormatOptions {
  format?: string;
  includeTime?: boolean;
  locale?: string;
  timeZone?: string;
}

export interface FormattedDateResult {
  formatted: string;
  valid: boolean;
  timestamp: number;
  relative?: string;
  date: Date;
}

export interface DateFormatterConfig {
  defaultFormat: string;
  defaultLocale: string;
  defaultTimeZone: string;
}

export class DateFormatter {
  private static instance: DateFormatter;
  private defaultFormat = 'yyyy-MM-dd';

  public static getInstance(): DateFormatter {
    if (!DateFormatter.instance) {
      DateFormatter.instance = new DateFormatter();
    }
    return DateFormatter.instance;
  }

  public formatDate(date: Date | string, options: DateFormatOptions = {}): FormattedDateResult {
    try {
      const dateObj = typeof date === 'string' ? parseISO(date) : date;
      const formatStr = options.format || this.defaultFormat;
      
      return {
        formatted: format(dateObj, formatStr),
        valid: true,
        timestamp: dateObj.getTime(),
        date: dateObj
      };
    } catch (error) {
      return {
        formatted: 'Invalid date',
        valid: false,
        timestamp: 0,
        date: new Date(0)
      };
    }
  }
}

export const dateFormatter = DateFormatter.getInstance();

export const formatDate = (date: Date | string, options?: DateFormatOptions): string => {
  const result = dateFormatter.formatDate(date, options);
  return result.formatted;
};
