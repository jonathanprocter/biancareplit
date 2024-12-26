
import { useToastStore } from '@/lib/toast';
import { db } from '@/db';

export async function verifyDependencies() {
  try {
    // Test toast
    const toast = useToastStore.getState();
    toast.showToast('Test message');

    // Test DB
    await db.query.users.findMany();
    
    return true;
  } catch (error) {
    console.error('Dependency test failed:', error);
    return false;
  }
}