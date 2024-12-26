import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

declare class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props);
  static getDerivedStateFromError(error: Error): State;
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void;
  handleRetry(): void;
  render(): ReactNode;
}

export default ErrorBoundary;