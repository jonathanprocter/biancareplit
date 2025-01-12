// Type definitions for formatting test
interface FormattedItem {
  id: number;
  name: string;
  status: 'active' | 'inactive';
  metadata?: Record<string, unknown>;
}

interface NestedConfig {
  enabled: boolean;
  values: Array<number>;
  items: FormattedItem[];
  settings: {
    timeout: number;
    retryCount: number;
    flags: { debug: boolean; verbose: boolean };
  };
}

// Predefined timestamp to ensure consistency
const creationTimestamp = new Date().toISOString();

// Object formatting test with complex types
export const formattedCode: NestedConfig = {
  enabled: true,
  values: [1, 2, 3, 4, 5],
  items: [
    {
      id: 1,
      name: 'First Item',
      status: 'active',
      metadata: { created: creationTimestamp, tags: ['important', 'featured'] },
    },
    { id: 2, name: 'Second Item', status: 'inactive' },
  ],
  settings: {
    timeout: 5000,
    retryCount: 3,
    flags: { debug: false, verbose: true },
  },
};

// Utility function with type safety
export function processItems(
  items: FormattedItem[],
  config: Partial<NestedConfig>,
): FormattedItem[] {
  // Use structured logging instead of console.log
  const logger = {
    debug: (message: string, data?: unknown) => {
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        // Using a structured format for better tracing
        const logData = {
          timestamp: new Date().toISOString(),
          level: 'debug',
          message,
          data,
        };
        // eslint-disable-next-line no-console
        console.debug(JSON.stringify(logData));
      }
    },
  };

  logger.debug('Processing items with config', { itemCount: items.length, config });
  return items.filter((item) => item.status === 'active');
}
