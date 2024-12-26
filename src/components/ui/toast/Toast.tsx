
import React, { useEffect } from 'react';
import { useToast } from '../../../hooks/use-toast';

export function Toast() {
  const { message, type, hide } = useToast();

  useEffect(() => {
    if (message) {
      const timer = setTimeout(hide, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, hide]);

  if (!message) return null;

  const bgColor = type === 'success' ? 'bg-green-500' :
                 type === 'error' ? 'bg-red-500' :
                 'bg-blue-500';

  return (
    <div className={`fixed bottom-4 right-4 p-4 rounded-lg text-white ${bgColor} z-50`}>
      {message}
    </div>
  );
}
