// Type definitions
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
    flags: {
      debug: boolean;
      verbose: boolean;
    };
  };
}

// Object formatting test with complex types
export const formattedCode: NestedConfig = {
  enabled: true,
  values: [1, 2, 3, 4, 5],
  items: [
    {
      id: 1,
      name: 'First Item',
      status: 'active',
      metadata: {
        created: new Date().toISOString(),
        tags: ['important', 'featured'],
      },
    },
    {
      id: 2,
      name: 'Second Item',
      status: 'inactive',
    },
  ],
  settings: {
    timeout: 5000,
    retryCount: 3,
    flags: {
      debug: false,
      verbose: true,
    },
  },
};

// Utility function with type safety
export function processItems(
  items: FormattedItem[],
  config: Partial<NestedConfig>,
): FormattedItem[] {
  console.log('Processing items with config:', config);
  return items.filter((item) => item.status === 'active');
}
