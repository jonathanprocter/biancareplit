import { toast } from 'sonner';

type NotificationType = 'success' | 'error' | 'info';

class NotificationManager {
  private static instance: NotificationManager;

  private constructor() {}

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  addNotification(message: string, type: NotificationType = 'info'): void {
    if (!message) return;

    switch (type) {
      case 'success':
        toast.success(message);
        break;
      case 'error':
        toast.error(message);
        break;
      case 'info':
        toast.info(message);
        break;
    }
  }
}

export default NotificationManager;