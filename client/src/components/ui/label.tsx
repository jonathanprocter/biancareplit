import { Root as LabelPrimitive, LabelPrimitiveProps } from '@radix-ui/react-label';
import { VariantProps, cva } from 'class-variance-authority';

import React, { ComponentPropsWithoutRef, forwardRef } from 'react';

import { cn } from '@/lib/utils';

const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
);

type LabelProps = ComponentPropsWithoutRef<typeof LabelPrimitive> &
  VariantProps<typeof labelVariants>;

const Label = forwardRef<React.ElementRef<typeof LabelPrimitive>, LabelProps>(
  ({ className, ...props }, ref) => (
    <LabelPrimitive ref={ref} className={cn(labelVariants(), className)} {...props} />
  ),
);

Label.displayName = 'Label';

export { Label };
