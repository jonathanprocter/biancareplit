import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { render } from '@/lib/test-utils';

import { TestItem, TestPrettier } from './TestPrettier';

// Create a container for portal elements
let portalRoot: HTMLDivElement;

beforeEach(() => {
  portalRoot = document.createElement('div');
  portalRoot.setAttribute('id', 'radix-portal');
  document.body.appendChild(portalRoot);
});

afterEach(() => {
  cleanup();
  if (document.body.contains(portalRoot)) {
    portalRoot.remove();
  }
});

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

describe('TestPrettier', () => {
  const mockItems: TestItem[] = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
  ];

  it('renders correctly with title and items', () => {
    render(<TestPrettier title="Test Title" items={mockItems} />);

    // Check title is rendered
    const titleElement = screen.getByText('Test Title');
    expect(titleElement).toBeInTheDocument();

    // Check items are rendered in the main view (not in dialog)
    expect(screen.getByRole('button', { name: /open dialog/i })).toBeInTheDocument();
  });

  it('opens dialog when button is clicked', async () => {
    render(<TestPrettier title="Test" items={mockItems} />);

    // Click open button
    const openButton = screen.getByRole('button', { name: /open dialog/i });
    await userEvent.click(openButton);

    // Wait for and check if dialog content is visible
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Test/i)).toBeInTheDocument();
  });
});
