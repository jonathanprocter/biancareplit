import { type FC, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

export const Button: FC<ButtonProps> = ({ 
  children, 
  className,
  variant = 'primary',
  ...props 
}) => {
  return (
    <button
      className={cn(
        'rounded px-4 py-2 font-semibold transition-colors',
        variant === 'primary' && 'bg-primary text-primary-foreground hover:bg-primary/90',
        variant === 'secondary' && 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
