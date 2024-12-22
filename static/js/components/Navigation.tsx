import { useLocation } from 'wouter';
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';

const Navigation = () => {
  const [location, setLocation] = useLocation();

  return (
    <NavigationMenu className="px-4 py-2 border-b">
      <NavigationMenuList className="flex items-center justify-between w-full">
        <NavigationMenuItem>
          <NavigationMenuLink
            className={navigationMenuTriggerStyle()}
            onClick={() => setLocation('/')}
          >
            Medical Education Platform
          </NavigationMenuLink>
        </NavigationMenuItem>

        <div className="flex items-center space-x-4">
          <NavigationMenuItem>
            <NavigationMenuLink
              className={navigationMenuTriggerStyle()}
              onClick={() => setLocation('/')}
            >
              Dashboard
            </NavigationMenuLink>
          </NavigationMenuItem>

          <NavigationMenuItem>
            <NavigationMenuLink
              className={navigationMenuTriggerStyle()}
              onClick={() => setLocation('/study')}
            >
              Study
            </NavigationMenuLink>
          </NavigationMenuItem>

          <NavigationMenuItem>
            <NavigationMenuLink
              className={navigationMenuTriggerStyle()}
              onClick={() => setLocation('/analytics')}
            >
              Analytics
            </NavigationMenuLink>
          </NavigationMenuItem>

          <NavigationMenuItem>
            <NavigationMenuLink
              className={navigationMenuTriggerStyle()}
              onClick={() => setLocation('/chat')}
            >
              AI Chat
            </NavigationMenuLink>
          </NavigationMenuItem>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setLocation('/profile')}
          >
            Profile
          </Button>
          <Button
            variant="default"
            onClick={() => {
              // Handle logout
              setLocation('/login');
            }}
          >
            Sign Out
          </Button>
        </div>
      </NavigationMenuList>
    </NavigationMenu>
  );
};

export default Navigation;
