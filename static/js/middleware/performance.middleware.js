import { BaseMiddleware } from './base.middleware';

class PerformanceMiddleware extends BaseMiddleware {
  constructor(options = {}) {
    super({
      name: 'PerformanceMiddleware',
      priority: 2,
      ...options,
    });

    this.thresholds = {
      warning: options.warningThreshold || 1000, // 1 second
      critical: options.criticalThreshold || 3000, // 3 seconds
    };

    this.metrics = new Map();
    this.aggregateMetrics = {
      totalRequests: 0,
      totalErrors: 0,
      averageDuration: 0,
      criticalCount: 0,
      warningCount: 0,
    };

    // Initialize periodic metrics cleanup
    this.startMetricsCleanup();
  }

  async execute(context, next) {
    const operationId = crypto.randomUUID();
    const startTime = performance.now();
    const memoryStart = this.getMemoryUsage();

    try {
      // Add tracking to context
      context.performanceTracking = {
        operationId,
        startTime,
        memoryStart,
      };

      // Execute next middleware
      const result = await next();

      // Calculate and store metrics
      await this.trackPerformance(context, startTime, memoryStart, 'success');

      return result;
    } catch (error) {
      // Track error performance
      await this.trackPerformance(context, startTime, memoryStart, 'error', error);
      throw error;
    }
  }

  async trackPerformance(context, startTime, memoryStart, status, error = null) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    const memoryUsed = this.getMemoryUsage() - memoryStart;

    const metrics = {
      operationId: context.performanceTracking.operationId,
      duration,
      memoryUsed,
      timestamp: new Date().toISOString(),
      operation: context.operation || 'unknown',
      path: context.path,
      method: context.method,
      status,
      performanceStatus: this.getPerformanceStatus(duration),
    };

    if (error) {
      metrics.error = {
        message: error.message,
        type: error.constructor.name,
      };
      this.aggregateMetrics.totalErrors++;
    }

    // Update metrics storage
    this.metrics.set(metrics.operationId, metrics);
    this.updateAggregateMetrics(metrics);

    // Emit performance events if necessary
    if (duration > this.thresholds.warning) {
      await this.emitPerformanceWarning(metrics);
    }

    return metrics;
  }

  updateAggregateMetrics(metrics) {
    this.aggregateMetrics.totalRequests++;

    // Update average duration
    const oldTotal =
      this.aggregateMetrics.averageDuration * (this.aggregateMetrics.totalRequests - 1);
    this.aggregateMetrics.averageDuration =
      (oldTotal + metrics.duration) / this.aggregateMetrics.totalRequests;

    // Update performance counters
    if (metrics.performanceStatus === 'critical') {
      this.aggregateMetrics.criticalCount++;
    } else if (metrics.performanceStatus === 'warning') {
      this.aggregateMetrics.warningCount++;
    }
  }

  getPerformanceStatus(duration) {
    if (duration > this.thresholds.critical) return 'critical';
    if (duration > this.thresholds.warning) return 'warning';
    return 'healthy';
  }

  async emitPerformanceWarning(metrics) {
    try {
      const warningData = {
        ...metrics,
        thresholds: this.thresholds,
        aggregate: this.getAggregateMetrics(),
      };

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('performance_warning', {
            detail: warningData,
          }),
        );
      }

      // Emit through middleware system if available
      if (this.eventEmitter) {
        await this.eventEmitter.emit('performance_warning', warningData);
      }
    } catch (error) {
      console.error('[PerformanceMiddleware] Error emitting warning:', error);
    }
  }

  getMemoryUsage() {
    return performance.memory?.usedJSHeapSize || 0;
  }

  startMetricsCleanup() {
    setInterval(() => {
      const threshold = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
      let cleanedCount = 0;

      for (const [key, value] of this.metrics.entries()) {
        if (new Date(value.timestamp).getTime() < threshold) {
          this.metrics.delete(key);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`[PerformanceMiddleware] Cleaned ${cleanedCount} old metrics`);
      }
    }, 60 * 60 * 1000); // Run every hour
  }

  getMetrics() {
    const metrics = {
      current: Array.from(this.metrics.values()),
      aggregate: this.getAggregateMetrics(),
      system: {
        memoryUsage: this.getMemoryUsage(),
        timestamp: new Date().toISOString(),
      },
    };

    // Emit metrics update event if available
    if (this.eventEmitter) {
      this.eventEmitter.emit('metrics_update', metrics);
    }

    return metrics;
  }

  getAggregateMetrics() {
    const metrics = {
      ...this.aggregateMetrics,
      timestamp: new Date().toISOString(),
      errorRate:
        this.aggregateMetrics.totalRequests > 0
          ? (
              (this.aggregateMetrics.totalErrors / this.aggregateMetrics.totalRequests) *
              100
            ).toFixed(2)
          : 0,
      performanceScore: this.calculatePerformanceScore(),
    };

    return metrics;
  }

  calculatePerformanceScore() {
    if (this.aggregateMetrics.totalRequests === 0) return 100;

    const errorPenalty =
      (this.aggregateMetrics.totalErrors / this.aggregateMetrics.totalRequests) * 30;
    const warningPenalty =
      (this.aggregateMetrics.warningCount / this.aggregateMetrics.totalRequests) * 15;
    const criticalPenalty =
      (this.aggregateMetrics.criticalCount / this.aggregateMetrics.totalRequests) * 25;

    const baseScore = 100;
    const finalScore = Math.max(
      0,
      Math.min(100, baseScore - errorPenalty - warningPenalty - criticalPenalty),
    );

    return Number(finalScore.toFixed(2));
  }
}

export default PerformanceMiddleware;
