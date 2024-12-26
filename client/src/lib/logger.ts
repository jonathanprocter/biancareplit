type LogLevel = 'info' | 'warn' | 'error';

interface LogOptions {
  timestamp?: boolean;
  level?: LogLevel;
}

const defaultOptions: LogOptions = {
  timestamp: true,
  level: 'info',
};

function formatLog(message: string, data?: unknown, options: LogOptions = defaultOptions): string {
  const timestamp = options.timestamp ? `[${new Date().toISOString()}] ` : '';
  const level = options.level ? `[${options.level.toUpperCase()}] ` : '';
  const dataStr = data ? ` ${JSON.stringify(data, null, 2)}` : '';

  return `${timestamp}${level}${message}${dataStr}`;
}

export function logInfo(message: string, data?: unknown): void {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log(formatLog(message, data, { level: 'info' }));
  }
}

export function logWarn(message: string, data?: unknown): void {
  if (process.env.NODE_ENV === 'development') {
    console.warn(formatLog(message, data, { level: 'warn' }));
  }
}

export function logError(message: string, error?: unknown): void {
  if (process.env.NODE_ENV === 'development') {
    console.error(formatLog(message, error, { level: 'error' }));
  }
}
