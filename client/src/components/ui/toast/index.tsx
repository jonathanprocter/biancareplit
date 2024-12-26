'use client';

// Re-export from the central location
export { toast, useToast } from '@/hooks/use-toast';
export type { ToastProps } from '@/hooks/use-toast';

// This file exists only for backward compatibility
// All toast functionality is now handled by sonner