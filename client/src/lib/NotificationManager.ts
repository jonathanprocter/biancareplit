import { toast } from '@/hooks/use-toast';

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

  addNotification(message: string, type: NotificationType = 'info') {
    try {
      toast({
        title: message,
        variant: type
      });
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }
}

export default NotificationManager;