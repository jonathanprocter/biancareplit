import { Link, useLocation } from 'wouter';

import { useState } from 'react';

import { Button } from '@/components/ui/button';

import { useToast } from '@/hooks/use-toast';

function Navigation() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [location] = useLocation();
  const { toast } = useToast();

  // Show navigation on all routes for testing
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
      window.location.href = '/';
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
    <nav className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-lg font-bold text-primary">
              Medical Education
            </Link>
            <div className="hidden md:flex space-x-4">
              <Link
                href="/dashboard"
                className={`text-sm font-medium ${
                  location === '/dashboard' ? 'text-primary' : 'text-foreground hover:text-primary'
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/progress"
                className={`text-sm font-medium ${
                  location === '/progress' ? 'text-primary' : 'text-foreground hover:text-primary'
                }`}
              >
                My Progress
              </Link>
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
        </div>
      </div>
    </nav>
  );
}

export default Navigation;
