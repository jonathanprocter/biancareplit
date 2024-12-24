import { useLocation } from 'wouter';

import { useState } from 'react';

import { Button } from '@/components/ui/button';

import { useToast } from '@/hooks/use-toast';

export function Navigation() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLogout = async () => {
    if (isLoggingOut) return;

    try {
      setIsLoggingOut(true);
      localStorage.removeItem('userId');
      localStorage.removeItem('username');
      toast({
        title: 'Success',
        description: 'Logged out successfully',
      });
      setLocation('/login');
    } catch (error) {
      console.error('Logout error:', error instanceof Error ? error.message : 'Unknown error');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to log out. Please try again.',
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="sticky top-0 z-50 w-full border-b border-border bg-background">
      <div className="container mx-auto px-4">
        <nav className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setLocation('/')}
              className="text-lg font-semibold hover:text-primary bg-transparent border-none p-0"
            >
              Medical Education
            </button>

            <div className="hidden md:flex space-x-4">
              <button
                onClick={() => setLocation('/dashboard')}
                className={`hover:text-primary bg-transparent border-none p-0 ${
                  location === '/dashboard' ? 'text-primary' : ''
                }`}
              >
                Dashboard
              </button>

              <button
                onClick={() => setLocation('/progress')}
                className={`hover:text-primary bg-transparent border-none p-0 ${
                  location === '/progress' ? 'text-primary' : ''
                }`}
              >
                My Progress
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-sm"
            >
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </Button>
          </div>
        </nav>
      </div>
    </div>
  );
}

export default Navigation;
