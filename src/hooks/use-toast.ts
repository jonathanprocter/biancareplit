
import { toast } from 'sonner';

export const useToast = () => {
  return {
    toast: {
      error: (message: string) => toast.error(message),
      success: (message: string) => toast.success(message),
      info: (message: string) => toast.info(message)
    }
  };
};
