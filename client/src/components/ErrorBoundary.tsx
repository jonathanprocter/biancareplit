import { AlertCircle } from 'lucide-react';

import React from 'react';

import { Card, CardContent } from '@/components/ui/card';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="max-w-4xl mx-auto p-4">
          <CardContent className="p-6">
            <div className="flex mb-4 gap-2">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <h1 className="text-2xl font-bold">Something went wrong</h1>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
            </p>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
