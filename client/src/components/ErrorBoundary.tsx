import { AlertCircle } from 'lucide-react';

import React, { Component, ErrorInfo, ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to an error reporting service
    console.error('Uncaught error:', error);
    console.error('Error info:', errorInfo);

    this.setState({
      error,
      errorInfo,
    });
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Check if a custom fallback is provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="max-w-4xl mx-auto p-4">
          <CardContent className="p-6">
            <div className="flex mb-4 gap-2">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <h1 className="text-2xl font-bold">Something went wrong</h1>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mt-4">
                <summary className="text-sm font-medium cursor-pointer">Stack trace</summary>
                <pre className="mt-2 text-xs bg-secondary/50 p-4 rounded-md overflow-auto">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            <Button onClick={this.handleRetry} className="mt-6">
              Try Again
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
