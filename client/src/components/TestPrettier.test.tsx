import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useToast } from '@/components/ui/toast';

interface TestItem {
  id: number;
  name: string;
}

interface TestPrettierProps {
  items: TestItem[];
  onSelect?: (item: TestItem) => void;
  isLoading?: boolean;
  error?: string;
}

// Mock the toast hook
jest.mock('@/components/ui/toast', () => ({
  useToast: jest.fn(() => ({
    toast: jest.fn(),
  })),
}));

describe('TestPrettier Component', () => {
  // Mock data for tests
  const mockItems: TestItem[] = [
    { id: 1, name: 'Test Item 1' },
    { id: 2, name: 'Test Item 2' },
  ];

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders component with items correctly', () => {
    render(<TestPrettier items={mockItems} />);

    // Check if items are rendered
    mockItems.forEach((item) => {
      expect(screen.getByText(item.name)).toBeInTheDocument();
    });
  });

  it('handles item selection correctly', async () => {
    const mockOnSelect = jest.fn();
    render(<TestPrettier items={mockItems} onSelect={mockOnSelect} />);

    // Click the first item
    await userEvent.click(screen.getByText(mockItems[0].name));

    expect(mockOnSelect).toHaveBeenCalledWith(mockItems[0]);
  });

  it('displays error message when items are empty', () => {
    render(<TestPrettier items={[]} />);

    expect(screen.getByText(/no items available/i)).toBeInTheDocument();
  });

  it('shows loading state correctly', () => {
    render(<TestPrettier items={mockItems} isLoading={true} />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('shows error state correctly', () => {
    const errorMessage = 'Failed to load items';
    render(<TestPrettier items={[]} error={errorMessage} />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(useToast).toHaveBeenCalled();
  });
});
