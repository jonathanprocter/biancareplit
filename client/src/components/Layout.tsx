
import React from 'react';
import { Toast } from './Toast';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toast />
    </>
  );
}
