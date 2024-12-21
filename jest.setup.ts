import '@testing-library/jest-dom';
import { expect, afterEach } from '@jest/globals';
import { cleanup } from '@testing-library/react';

// Automatically cleanup after each test
afterEach(() => {
  cleanup();
});
