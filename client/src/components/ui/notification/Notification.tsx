
import React from 'react';
import { createRoot } from 'react-dom/client';

interface NotificationProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
}

const Notification: React.FC<NotificationProps> = ({ message, type = 'info', duration = 3000 }) => {
  const backgroundColor = type === 'success' ? 'bg-green-500' : 
                         type === 'error' ? 'bg-red-500' : 
                         'bg-blue-500';
                         
  return (
    <div className={`fixed bottom-4 right-4 p-4 rounded-lg text-white ${backgroundColor} shadow-lg`}>
      {message}
    </div>
  );
};

export const showNotification = (props: NotificationProps) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  
  root.render(<Notification {...props} />);
  
  setTimeout(() => {
    root.unmount();
    container.remove();
  }, props.duration || 3000);
};
