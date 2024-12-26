
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import NotificationManager from '../../../lib/NotificationManager';

interface NotificationProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
}

export const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = NotificationManager.getInstance().subscribe(
      (updatedNotifications) => {
        setNotifications(updatedNotifications);
      }
    );
    return unsubscribe;
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`rounded-lg p-4 shadow-lg ${
            notification.type === 'error' ? 'bg-red-500' :
            notification.type === 'success' ? 'bg-green-500' :
            'bg-blue-500'
          } text-white`}
        >
          {notification.message}
        </div>
      ))}
    </div>
  );
};

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
