import { afterEach, expect } from '@jest/globals';
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';

// Extend Jest matchers
expect.extend({});

// Automatically cleanup after each test
afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserverMock;

// Setup for Radix UI components
Object.defineProperty(window, 'DOMRect', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    toJSON: jest.fn(),
  })),
});

// Add required methods for Radix UI portal handling
if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
  window.HTMLElement.prototype.releasePointerCapture = jest.fn();
  window.HTMLElement.prototype.hasPointerCapture = jest.fn();
}
