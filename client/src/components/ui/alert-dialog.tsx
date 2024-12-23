import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';

import * as React from 'react';

import { buttonVariants } from '@/components/ui/button';

import { cn } from '@/lib/utils';

const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
const AlertDialogPortal = AlertDialogPrimitive.Portal;

const AlertDialogOverlay = React.forwardRef((props, ref) => {
  const { className, ...otherProps } = props;
  return (
    <AlertDialogPrimitive.Overlay
      className={cn(
        'fixed inset-0 z-50 bg-black/80 animate-in animate-out fade-out-0 fade-in-0',
        className,
      )}
      ref={ref}
      {...otherProps}
    />
  );
});
AlertDialogOverlay.displayName = 'AlertDialogOverlay';

const AlertDialogContent = React.forwardRef((props, ref) => {
  const { className, ...otherProps } = props;
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 animate-in animate-out fade-out-0 fade-in-0 zoom-out-95 zoom-in-95 slide-out-to-left-1/2 slide-out-to-top-1/2 slide-in-from-left-1/2 slide-in-from-top-1/2 sm:rounded-lg',
          className,
        )}
        {...otherProps}
      />
    </AlertDialogPortal>
  );
});
AlertDialogContent.displayName = 'AlertDialogContent';

const AlertDialogHeader = (props) => {
  const { className, ...otherProps } = props;
  return (
    <div
      className={cn('flex flex-col space-y-2 text-center sm:text-left', className)}
      {...otherProps}
    />
  );
};
AlertDialogHeader.displayName = 'AlertDialogHeader';

const AlertDialogFooter = (props) => {
  const { className, ...otherProps } = props;
  return (
    <div
      className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
      {...otherProps}
    />
  );
};
AlertDialogFooter.displayName = 'AlertDialogFooter';

const AlertDialogTitle = React.forwardRef((props, ref) => {
  const { className, ...otherProps } = props;
  return (
    <AlertDialogPrimitive.Title
      ref={ref}
      className={cn('text-lg font-semibold', className)}
      {...otherProps}
    />
  );
});
AlertDialogTitle.displayName = 'AlertDialogTitle';

const AlertDialogDescription = React.forwardRef((props, ref) => {
  const { className, ...otherProps } = props;
  return (
    <AlertDialogPrimitive.Description
      ref={ref}
      className={cn('text-sm text-muted-foreground', className)}
      {...otherProps}
    />
  );
});
AlertDialogDescription.displayName = 'AlertDialogDescription';

const AlertDialogAction = React.forwardRef((props, ref) => {
  const { className, ...otherProps } = props;
  return (
    <AlertDialogPrimitive.Action
      ref={ref}
      className={cn(buttonVariants(), className)}
      {...otherProps}
    />
  );
});
AlertDialogAction.displayName = 'AlertDialogAction';

const AlertDialogCancel = React.forwardRef((props, ref) => {
  const { className, ...otherProps } = props;
  return (
    <AlertDialogPrimitive.Cancel
      ref={ref}
      className={cn(buttonVariants({ variant: 'outline' }), 'mt-2 sm:mt-0', className)}
      {...otherProps}
    />
  );
});
AlertDialogCancel.displayName = 'AlertDialogCancel';

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
