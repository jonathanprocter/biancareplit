import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
declare const Dialog: React.FC<DialogPrimitive.DialogProps>;
declare const DialogTrigger: React.ForwardRefExoticComponent<
  DialogPrimitive.DialogTriggerProps & React.RefAttributes<HTMLButtonElement>
>;
declare const DialogPortal: React.FC<DialogPrimitive.DialogPortalProps>;
declare const DialogOverlay: React.ForwardRefExoticComponent<
  Omit<DialogPrimitive.DialogOverlayProps & React.RefAttributes<HTMLDivElement>, 'ref'> &
    React.RefAttributes<HTMLDivElement>
>;
declare const DialogContent: React.ForwardRefExoticComponent<
  Omit<DialogPrimitive.DialogContentProps & React.RefAttributes<HTMLDivElement>, 'ref'> &
    React.RefAttributes<HTMLDivElement>
>;
export { Dialog, DialogTrigger, DialogContent, DialogOverlay, DialogPortal };
