import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { TestPrettier } from './TestPrettier';

// Set up userEvent
const user = userEvent.setup();

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

describe('TestPrettier', () => {
  const mockItems = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
  ];

  it('renders correctly with title and items', async () => {
    render(<TestPrettier title="Test Title" items={mockItems} />);

    // Check main title
    expect(screen.getByText('Test Title')).toBeInTheDocument();

    // Open dialog
    const openButton = screen.getByText('Open Dialog');
    await user.click(openButton);

    // Check dialog content
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();

    // Check items in dialog
    for (const item of mockItems) {
      expect(screen.getByText(item.name)).toBeInTheDocument();
    }
  });

  it('opens and closes dialog when buttons are clicked', async () => {
    render(<TestPrettier title="Test" items={mockItems} />);

    // Open dialog
    const openButton = screen.getByText('Open Dialog');
    await user.click(openButton);

    // Wait for dialog to be visible
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();

    // Check if items are rendered in dialog
    for (const item of mockItems) {
      expect(screen.getByDisplayValue(item.name)).toBeInTheDocument();
    }

    // Click first button in dialog
    const clickMeButtons = screen.getAllByText('Click Me');
    await user.click(clickMeButtons[0]);

    // Close dialog using Escape key
    await user.keyboard('{Escape}');

    // Wait for dialog to be removed
    await waitFor(
      () => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });

  it('handles empty items array gracefully', () => {
    render(<TestPrettier title="Empty Test" items={[]} />);

    expect(screen.getByText('Empty Test')).toBeInTheDocument();
    const openButton = screen.getByText('Open Dialog');
    expect(openButton).toBeInTheDocument();
  });

  it('handles click events on all items', async () => {
    render(<TestPrettier title="Test" items={mockItems} />);

    // Open dialog
    await user.click(screen.getByText('Open Dialog'));

    // Click all "Click Me" buttons
    const buttons = screen.getAllByText('Click Me');
    for (const button of buttons) {
      await user.click(button);
    }
  });
});