import { BaseMiddleware } from './base.middleware';

export class LoggingMiddleware extends BaseMiddleware {
  constructor(options = {}) {
    super(options);
    this.name = options.name || 'LoggingMiddleware';
    this.priority = options.priority || 1;
    this.logLevel = options.logLevel || 'info';
    this.logFormat = options.logFormat || 'json';
  }

  async execute(context, next) {
    const requestId = crypto.randomUUID();
    const startTime = performance.now();

    // Pre-execution logging
    this.log('info', {
      type: 'request_start',
      requestId,
      timestamp: new Date().toISOString(),
      context: this.sanitizeContext(context),
    });

    try {
      const result = await next();

      // Post-execution logging
      this.log('info', {
        type: 'request_complete',
        requestId,
        duration: performance.now() - startTime,
        timestamp: new Date().toISOString(),
        success: true,
      });

      return result;
    } catch (error) {
      // Error logging
      this.log('error', {
        type: 'request_error',
        requestId,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
        duration: performance.now() - startTime,
        timestamp: new Date().toISOString(),
      });

      throw error;
    }
  }

  log(level, data) {
    if (this.logFormat === 'json') {
      console[level](JSON.stringify(data));
    } else {
      console[level](data);
    }
  }

  sanitizeContext(context) {
    const sanitized = { ...context };
    delete sanitized.credentials;
    delete sanitized.secrets;
    return sanitized;
  }
}

module.exports = { LoggingMiddleware };
