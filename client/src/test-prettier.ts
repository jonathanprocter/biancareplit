// Object formatting test
export const formattedCode = {
  test: 'This is properly formatted',
  nested: {
    value: true,
    items: [1, 2, 3],
    complexItems: [
      { id: 1, name: 'test1' },
      { id: 2, name: 'test2' },
    ],
  },
  methods: {
    testMethod(param: string): string {
      return `Test ${param}`;
    },
  },
};

// Function formatting test
export function testFunction(param1: string, param2: number): string {
  console.log('Testing Prettier formatting');
  return `${param1}${param2}`;
}
