import { describe, expect, it } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';

import React from 'react';

import { TestPrettier } from './TestPrettier';

describe('TestPrettier', () => {
  const mockItems = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
  ];

  it('renders correctly with title and items', () => {
    render(<TestPrettier title="Test Title" items={mockItems} />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('opens dialog when button is clicked', () => {
    render(<TestPrettier title="Test" items={mockItems} />);

    const button = screen.getByText('Open Dialog');
    fireEvent.click(button);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
