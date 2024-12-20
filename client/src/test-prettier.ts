export const unformattedCode = {
  test: 'This is intentionally unformatted',
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

export function testFunction(param1: string, param2: number): string {
  console.log('Testing Prettier formatting');
  return param1 + String(param2);
}

// Test JSX formatting
export const TestComponent = () => {
  return (
    <div className="container">
      <h1>Test Component</h1>
      <p>This is a test of JSX formatting</p>
    </div>
  );
};
