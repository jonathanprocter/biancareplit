import { format, formatDistance, parseISO, isValid } from 'date-fns';
import type {
  DateFormatOptions,
  FormattedDateResult,
  DateFormatterConfig,
  Locale,
} from '../types/common';

class DateFormatter {
  private static instance: DateFormatter;
  private config: DateFormatterConfig;

  private constructor() {
    this.config = {
      defaultTimeZone: 'UTC',
      defaultFormat: 'MMM dd, yyyy',
      defaultTimeFormat: 'MMM dd, yyyy HH:mm',
      defaultLocale: { code: 'en-US' } as Locale,
      formats: {
        default: {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        },
      },
    };
  }

  public static getInstance(): DateFormatter {
    if (!DateFormatter.instance) {
      DateFormatter.instance = new DateFormatter();
    }
    return DateFormatter.instance;
  }

  public formatDate(date: Date | string, options: DateFormatOptions = {}): FormattedDateResult {
    try {
      const dateObj = typeof date === 'string' ? parseISO(date) : date;

      if (!isValid(dateObj)) {
        return {
          formatted: 'Invalid date',
          valid: false,
          date: null,
          timestamp: undefined,
        };
      }

      const locale = options.locale || this.config.defaultLocale;

      if (options.relative) {
        const formatted = formatDistance(dateObj, new Date(), {
          addSuffix: true,
          locale,
        });

        return {
          formatted,
          valid: true,
          date: dateObj,
          timestamp: dateObj.getTime(),
          relative: formatted,
        };
      }

      const formatString =
        options.format ||
        (options.includeTime ? this.config.defaultTimeFormat : this.config.defaultFormat);

      const formatOptions: Record<string, any> = {
        locale,
      };

      if (options.timeZone) {
        formatOptions.timeZone = options.timeZone;
      }

      return {
        formatted: format(dateObj, formatString || 'PPP', formatOptions),
        valid: true,
        date: dateObj,
        timestamp: dateObj.getTime(),
      };
    } catch (error) {
      console.error('Date formatting error:', error);
      return {
        formatted: 'Invalid date',
        valid: false,
        date: null,
        timestamp: undefined,
      };
    }
  }

  public updateConfig(config: Partial<DateFormatterConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export const dateFormatter = DateFormatter.getInstance();

export function formatDate(date: Date | string, options: DateFormatOptions = {}): string {
  const result = dateFormatter.formatDate(date, options);
  return result.formatted;
}

export const formatDateWithTime = (date: Date | string): string =>
  formatDate(date, { includeTime: true });

export const formatRelativeDate = (date: Date | string): string =>
  formatDate(date, { relative: true });

export { DateFormatOptions, FormattedDateResult, DateFormatterConfig };
