export const unformattedCode = {
  test: 'This is intentionally unformatted',
  nested: {
    value: true,
    items: [1, 2, 3],
  },
};

export function testFunction(param1: string, param2: number) {
  console.log('Testing Prettier formatting');
  return param1 + String(param2);
}
