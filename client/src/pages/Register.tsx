import { useLocation } from 'wouter';
import { Link } from 'wouter';

import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import { useRegister } from '@/lib/api';

import { useToast } from '@/hooks/use-toast';

export function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const register = useRegister();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Perform validation and sanitization here.
    const isValid = validateForm(username, password, email);
    if (!isValid) {
      toast({
        variant: 'destructive',
        title: 'Invalid input',
        description: 'Please check your inputs and try again.',
      });
      return;
    }
    try {
      await register.mutateAsync({ username, password, email });
      setLocation('/dashboard');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Registration failed',
        description: 'Please try again.',
      });
    }
  };

  // Example validation function
  const validateForm = (username: string, password: string, email: string) => {
    // Add more comprehensive validation logic here
    return username.length >= 3 && password.length >= 6 && email.includes('@');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Create Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="username">
                Username
              </label>
              <Input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                Email
              </label>
              <Input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                Password
              </label>
              <Input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={register.isPending}
            >
              {register.isPending ? 'Creating Account...' : 'Create Account'}
            </Button>
            <p className="text-sm text-center mt-4">
              Already have an account?{' '}
              <Link href="/" className="text-blue-600 hover:underline">
                Login here
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
