import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@/lib/utils';

interface AvatarProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {}
interface AvatarImageProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image> {}
interface AvatarFallbackProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> {}

const AvatarRoot = ({ className, ...props }: AvatarProps, ref: React.Ref<React.ElementRef<typeof AvatarPrimitive.Root>>) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full', className)}
    {...props}
  />
);

const AvatarImageComponent = ({ className, ...props }: AvatarImageProps, ref: React.Ref<React.ElementRef<typeof AvatarPrimitive.Image>>) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('aspect-square h-full w-full', className)}
    {...props}
  />
);

const AvatarFallbackComponent = ({ className, ...props }: AvatarFallbackProps, ref: React.Ref<React.ElementRef<typeof AvatarPrimitive.Fallback>>) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn('flex h-full w-full items-center justify-center rounded-full bg-muted', className)}
    {...props}
  />
);

const Avatar = React.forwardRef(AvatarRoot);
Avatar.displayName = AvatarPrimitive.Root.displayName;
const AvatarImage = React.forwardRef(AvatarImageComponent);
AvatarImage.displayName = AvatarPrimitive.Image.displayName;
const AvatarFallback = React.forwardRef(AvatarFallbackComponent);
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback };