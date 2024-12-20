'use client';

import * as React from 'react';
import { cn } from '@lib/utils';

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'outline';
    size?: 'sm' | 'md' | 'lg';
  }
>(({ className, variant = 'primary', size = 'md', ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        {
          primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
          secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
          outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        }[variant],
        {
          sm: 'h-8 px-3 text-xs',
          md: 'h-10 px-4 py-2',
          lg: 'h-12 px-8 text-lg',
        }[size],
        className
      )}
      {...props}
    />
  );
});
Button.displayName = 'Button';

export { Button };
