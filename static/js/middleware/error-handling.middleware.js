class ErrorHandlingMiddleware {
  constructor(options = {}) {
    this.options = {
      logErrors: true,
      includeStackTrace: process.env.NODE_ENV !== 'production',
      errorMap: new Map([
        ['ValidationError', 400],
        ['AuthenticationError', 401],
        ['AuthorizationError', 403],
        ['NotFoundError', 404],
        ['ConflictError', 409],
        ['RateLimitError', 429],
        ['DatabaseError', 503],
      ]),
      ...options,
    };

    this.errorMetrics = {
      total: 0,
      byType: new Map(),
      byPath: new Map(),
      byStatusCode: new Map(),
    };
  }

  async execute(context, next) {
    try {
      return await next();
    } catch (error) {
      return this.handleError(error, context);
    }
  }

  async handleError(error, context) {
    const errorResponse = this.formatError(error);
    const timestamp = new Date().toISOString();

    // Update error metrics
    this.updateErrorMetrics(error, context, errorResponse);

    if (this.options.logErrors) {
      console.error('[ErrorHandling]', {
        error: errorResponse,
        requestId: context.requestId,
        timestamp,
        path: context.path,
        method: context.method,
        metrics: this.getMetrics(),
      });
    }

    // Emit error event for analytics tracking
    if (context.eventEmitter) {
      await context.eventEmitter.emit('error', {
        ...errorResponse,
        requestId: context.requestId,
        timestamp,
        context: {
          path: context.path,
          method: context.method,
          operation: context.operation,
        },
      });
    }

    return {
      success: false,
      error: errorResponse,
      requestId: context.requestId,
      timestamp,
    };
  }

  formatError(error) {
    const errorName = error.constructor.name;
    const statusCode = this.options.errorMap.get(errorName) || 500;

    const errorResponse = {
      code: statusCode,
      message: error.message || 'An unexpected error occurred',
      type: errorName,
      category: this.categorizeError(error),
    };

    if (this.options.includeStackTrace) {
      errorResponse.stack = error.stack;
    }

    if (error.details) {
      errorResponse.details = error.details;
    }

    return errorResponse;
  }

  categorizeError(error) {
    if (error instanceof SyntaxError) return 'syntax';
    if (error.code === 'ECONNREFUSED') return 'connection';
    if (error.name === 'ValidationError') return 'validation';
    if (error.name === 'AuthenticationError') return 'auth';
    return 'unknown';
  }

  updateErrorMetrics(error, context, errorResponse) {
    this.errorMetrics.total++;

    // Update by error type
    const currentTypeCount = this.errorMetrics.byType.get(error.constructor.name) || 0;
    this.errorMetrics.byType.set(error.constructor.name, currentTypeCount + 1);

    // Update by path
    const path = context.path || 'unknown';
    const currentPathCount = this.errorMetrics.byPath.get(path) || 0;
    this.errorMetrics.byPath.set(path, currentPathCount + 1);

    // Update by status code
    const statusCode = errorResponse.code;
    const currentStatusCount = this.errorMetrics.byStatusCode.get(statusCode) || 0;
    this.errorMetrics.byStatusCode.set(statusCode, currentStatusCount + 1);
  }

  getMetrics() {
    return {
      total: this.errorMetrics.total,
      byType: Object.fromEntries(this.errorMetrics.byType),
      byPath: Object.fromEntries(this.errorMetrics.byPath),
      byStatusCode: Object.fromEntries(this.errorMetrics.byStatusCode),
      timestamp: new Date().toISOString(),
    };
  }

  static formatValidationError(error) {
    return {
      code: 400,
      message: 'Validation error',
      type: 'ValidationError',
      details: error.details || [],
    };
  }
}

export default ErrorHandlingMiddleware;
