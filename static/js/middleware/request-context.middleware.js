import { configManager } from '../config/system.config.js';

class RequestContextMiddleware {
  constructor(options = {}) {
    this.options = {
      contextHeader: 'X-Request-Context',
      trackingEnabled: true,
      ...options,
    };
    this.contextStore = new Map();
  }

  async execute(context, next) {
    const requestId = this.generateRequestId();
    const startTime = performance.now();

    try {
      // Set request context
      this.contextStore.set(requestId, {
        startTime,
        requestId,
        timestamp: new Date().toISOString(),
      });

      // Add context to the request
      context.requestId = requestId;
      context.startTime = startTime;

      // Execute next middleware
      const result = await next();

      // Calculate request duration
      const duration = performance.now() - startTime;

      if (this.options.trackingEnabled) {
        this.trackRequest(requestId, duration);
      }

      return result;
    } finally {
      // Cleanup
      this.contextStore.delete(requestId);
    }
  }

  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  trackRequest(requestId, duration) {
    const context = this.contextStore.get(requestId);
    if (context) {
      console.log(
        `[RequestContext] Request ${requestId} completed in ${duration}ms`,
      );
      // Additional tracking logic can be added here
    }
  }
}

export default RequestContextMiddleware;
