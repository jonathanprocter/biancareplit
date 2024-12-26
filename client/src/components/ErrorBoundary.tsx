import { Component, ErrorInfo, ReactNode } from 'react';
import NotificationManager from '../lib/NotificationManager';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    NotificationManager.getInstance().addNotification(
      `Application Error: ${error.message}`,
      'error'
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-red-800 font-bold">Something went wrong</h2>
          <p className="text-red-600 mt-2">
            The application encountered an error. Please try refreshing the page.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}