
import { toast } from 'sonner';

export const useToast = () => ({
  toast: (options: { title: string; description: string; variant?: 'error' | 'success' | 'info' }) => {
    const { title, description, variant = 'default' } = options;
    if (variant === 'error') {
      toast.error(title, { description });
    } else if (variant === 'success') {
      toast.success(title, { description });
    } else if (variant === 'info') {
      toast.info(title, { description });
    } else {
      toast(title, { description });
    }
  }
});
