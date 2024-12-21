import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Button Component', () => {
  it('renders without crashing', () => {
    render(<button>Test Button</button>);
    expect(screen.getByText('Test Button')).toBeInTheDocument();
  });
});
