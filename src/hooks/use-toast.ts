
import { toast } from 'sonner';

export const useToast = () => ({
  toast: (options: { title?: string; description?: string; type?: 'success' | 'error' | 'info' }) => {
    const message = options.description || options.title;
    switch (options.type) {
      case 'success':
        toast.success(message);
        break;
      case 'error':
        toast.error(message);
        break;
      default:
        toast(message);
    }
  }
});
