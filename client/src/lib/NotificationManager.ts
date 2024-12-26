import { toast } from '@/hooks/use-toast';
import type { ToastProps } from '@/hooks/use-toast';

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

    const toastProps: ToastProps = {
      description: message,
      variant: type
    };

    toast(toastProps);
  }
}

export default NotificationManager;