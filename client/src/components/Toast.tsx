
import React from 'react';
import { useToastStore } from '@/lib/toast';

export function Toast() {
  const { message } = useToastStore();

  if (!message) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 z-50">
      {message}
    </div>
  );
}
