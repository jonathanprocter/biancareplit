import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import React from 'react';

import { Button } from './Button';

/**
 * Button component test cases
 */
describe('Button Component', () => {
  it('renders without crashing', () => {
    render(<Button>Test Button</Button>);
    const button = screen.getByText('Test Button');
    expect(button).toBeInTheDocument();
  });

  it('applies primary variant styles by default', () => {
    render(<Button>Primary Button</Button>);
    const button = screen.getByText('Primary Button');
    expect(button).toHaveClass('bg-primary');
  });

  it('applies secondary variant styles when specified', () => {
    render(<Button variant="secondary">Secondary Button</Button>);
    const button = screen.getByText('Secondary Button');
    expect(button).toHaveClass('bg-secondary');
  });

  it('handles click events', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Clickable Button</Button>);
    const button = await screen.findByText('Clickable Button');
    userEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
