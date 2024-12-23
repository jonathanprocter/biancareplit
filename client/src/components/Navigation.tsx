import { Link, useLocation } from 'wouter';

import { useState } from 'react';

import { Button } from '@/components/ui/button';

import { useToast } from '@/hooks/use-toast';

function Navigation() {
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [location] = useLocation();
  const publicRoutes = ['/', '/register'];

  // Don't show navigation on public routes
  if (publicRoutes.includes(location)) {
    return null;
  }

  const handleLogout = async () => {
    if (isLoggingOut) return;

    try {
      setIsLoggingOut(true);
      localStorage.removeItem('userId');
      localStorage.removeItem('username');
      window.location.href = '/';
    } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
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
            <Link
              href="/dashboard"
              className={`text-lg font-semibold ${
                location === '/dashboard' ? 'text-primary' : 'text-foreground hover:text-primary'
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/progress"
              className={`text-lg font-semibold ${
                location === '/progress' ? 'text-primary' : 'text-foreground hover:text-primary'
              }`}
            >
              My Progress
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
