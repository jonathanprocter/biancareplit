import { Link, useLocation } from 'wouter';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';

import { useToast } from '@/hooks/use-toast';

export function Navigation() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [location] = useLocation();
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
      window.location.href = '/login';
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
        <NavigationMenu>
          <NavigationMenuList className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <NavigationMenuItem>
                <Link href="/">
                  <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                    Medical Education
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>

              <div className="hidden md:flex space-x-4">
                <NavigationMenuItem>
                  <Link href="/dashboard">
                    <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                      Dashboard
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <Link href="/progress">
                    <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                      My Progress
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
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
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </div>
  );
}

export default Navigation;
