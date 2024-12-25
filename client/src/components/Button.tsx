import React from 'react';
import type { ButtonHTMLAttributes, FC } from 'react';

// Use relative path for utils import
import { cn } from '../lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

export const Button: FC<ButtonProps> = React.memo(
  ({ children, className = '', variant = 'primary', ...props }) => {
    const buttonClass =
      variant === 'primary'
        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
        : 'bg-secondary text-secondary-foreground hover:bg-secondary/90';

    return (
      <button
        className={cn('rounded px-4 py-2 font-semibold transition-colors', buttonClass, className)}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
