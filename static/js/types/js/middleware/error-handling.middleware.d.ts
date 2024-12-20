export default ErrorHandlingMiddleware;
declare class ErrorHandlingMiddleware {
  static formatValidationError(error: any): {
    code: number;
    message: string;
    type: string;
    details: any;
  };
  constructor(options?: {});
  options: {
    logErrors: boolean;
    includeStackTrace: boolean;
    errorMap: Map<string, number>;
  };
  errorMetrics: {
    total: number;
    byType: Map<any, any>;
    byPath: Map<any, any>;
    byStatusCode: Map<any, any>;
  };
  execute(context: any, next: any): Promise<any>;
  handleError(
    error: any,
    context: any
  ): Promise<{
    success: boolean;
    error: {
      code: number;
      message: any;
      type: any;
      category: string;
    };
    requestId: any;
    timestamp: string;
  }>;
  formatError(error: any): {
    code: number;
    message: any;
    type: any;
    category: string;
  };
  categorizeError(error: any): 'unknown' | 'syntax' | 'connection' | 'validation' | 'auth';
  updateErrorMetrics(error: any, context: any, errorResponse: any): void;
  getMetrics(): {
    total: number;
    byType: any;
    byPath: any;
    byStatusCode: any;
    timestamp: string;
  };
}
