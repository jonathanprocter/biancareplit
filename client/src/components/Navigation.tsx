import { Link, useLocation } from 'wouter';

import { useState } from 'react';

import { Button } from '@/components/ui/button';

import { useToast } from '@/hooks/use-toast';

export function Navigation() {
  const [location] = useLocation();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const publicRoutes = ['/', '/register'];

  if (publicRoutes.includes(location)) {
    return null;
  }

  const linkClass = (path: string): string => {
    return `text-lg font-semibold ${
      location === path ? 'text-primary' : 'text-foreground hover:text-primary'
    }`;
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      localStorage.removeItem('userId');
      localStorage.removeItem('username');
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
    <nav className="border-b border-border bg-background">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard">
              <a className={linkClass('/dashboard')}>Dashboard</a>
            </Link>
            <Link href="/progress">
              <a className={linkClass('/progress')}>My Progress</a>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={handleLogout} disabled={isLoggingOut}>
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;
