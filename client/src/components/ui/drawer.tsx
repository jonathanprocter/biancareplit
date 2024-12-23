import { Drawer as DrawerPrimitive } from 'vaul';

import * as React from 'react';

import { cn } from '@/lib/utils';

type DrawerProps = React.ComponentProps<typeof DrawerPrimitive.Root>;

const Drawer: React.FC<DrawerProps> = ({ shouldScaleBackground = true, ...props }) => (
  <DrawerPrimitive.Root shouldScaleBackground={shouldScaleBackground} {...props} />
);

Drawer.displayName = 'Drawer';

const DrawerTrigger = DrawerPrimitive.Trigger;
const DrawerPortal = DrawerPrimitive.Portal;
const DrawerClose = DrawerPrimitive.Close;

type OverlayProps = React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>;

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  OverlayProps
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-50 bg-black/80', className)}
    {...props}
  />
));

DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName;

type ContentProps = React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>;

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  ContentProps
>(({ className, children, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background',
        className,
      )}
      {...props}
    >
      <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />
      {children}
    </DrawerPrimitive.Content>
  </DrawerPortal>
));

DrawerContent.displayName = 'DrawerContent';

type HeaderProps = React.HTMLAttributes<HTMLDivElement>;

const DrawerHeader: React.FC<HeaderProps> = ({ className, ...props }) => (
  <div className={cn('grid gap-1.5 p-4 text-center sm:text-left', className)} {...props} />
);

DrawerHeader.displayName = 'DrawerHeader';

type FooterProps = React.HTMLAttributes<HTMLDivElement>;

const DrawerFooter: React.FC<FooterProps> = ({ className, ...props }) => (
  <div className={cn('mt-auto flex flex-col gap-2 p-4', className)} {...props} />
);

DrawerFooter.displayName = 'DrawerFooter';

type TitleProps = React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>;

const DrawerTitle = React.forwardRef<React.ElementRef<typeof DrawerPrimitive.Title>, TitleProps>(
  ({ className, ...props }, ref) => (
    <DrawerPrimitive.Title
      ref={ref}
      className={cn('text-lg font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  ),
);

DrawerTitle.displayName = DrawerPrimitive.Title.displayName;

type DescriptionProps = React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>;

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  DescriptionProps
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));

DrawerDescription.displayName = DrawerPrimitive.Description.displayName;

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
