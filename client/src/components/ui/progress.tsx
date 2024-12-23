import { Indicator, Root } from '@radix-ui/react-progress';

import React, { forwardRef } from 'react';

import { cn } from '@/lib/utils';

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof Root> {
  value?: number;
  className?: string;
}

const Progress = forwardRef<React.ElementRef<typeof Root>, ProgressProps>(
  ({ className, value = 0, ...props }, ref) => (
    <Root
      ref={ref}
      className={cn('relative h-4 w-full overflow-hidden rounded-full bg-secondary', className)}
      {...props}
    >
      <Indicator
        className="h-full w-full flex-1 bg-primary transition-all"
        style={{ transform: `translateX(-${100 - value}%)` }}
      />
    </Root>
  ),
);

Progress.displayName = 'Progress';

export default Progress;
