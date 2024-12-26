
import React from 'react';
import { Toaster } from 'sonner';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="bottom-right" />
    </>
  );
}
