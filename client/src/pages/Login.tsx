import { useLocation } from 'wouter';
import { Link } from 'wouter';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import { useLogin } from '@/lib/api';

import { useToast } from '@/hooks/use-toast';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const login = useLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login.mutateAsync({ username, password });
      setLocation('/dashboard');
    } catch (error) {
      if (error instanceof Error) {
        toast({
          variant: 'destructive',
          title: 'Login failed',
          description: error.message,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Login failed',
          description: 'An unexpected error occurred. Please try again.',
        });
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Nursing Education Platform
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                Username
              </label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={login.isPending}>
              {login.isPending ? 'Logging in...' : 'Login'}
            </Button>
            <p className="text-sm text-center mt-4">
              Don't have an account?{' '}
              <Link href="/register" className="text-blue-600 hover:underline">
                Register here
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
