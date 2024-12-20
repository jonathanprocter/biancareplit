export default PerformanceMiddleware;
declare class PerformanceMiddleware extends BaseMiddleware {
  constructor(options?: {});
  thresholds: {
    warning: any;
    critical: any;
  };
  metrics: Map<any, any>;
  aggregateMetrics: {
    totalRequests: number;
    totalErrors: number;
    averageDuration: number;
    criticalCount: number;
    warningCount: number;
  };
  execute(context: any, next: any): Promise<any>;
  trackPerformance(
    context: any,
    startTime: any,
    memoryStart: any,
    status: any,
    error?: null
  ): Promise<{
    operationId: any;
    duration: number;
    memoryUsed: number;
    timestamp: string;
    operation: any;
    path: any;
    method: any;
    status: any;
    performanceStatus: string;
  }>;
  updateAggregateMetrics(metrics: any): void;
  getPerformanceStatus(duration: any): 'warning' | 'critical' | 'healthy';
  emitPerformanceWarning(metrics: any): Promise<void>;
  getMemoryUsage(): any;
  startMetricsCleanup(): void;
  getMetrics(): {
    current: any[];
    aggregate: {
      timestamp: string;
      errorRate: string | number;
      performanceScore: number;
      totalRequests: number;
      totalErrors: number;
      averageDuration: number;
      criticalCount: number;
      warningCount: number;
    };
    system: {
      memoryUsage: any;
      timestamp: string;
    };
  };
  getAggregateMetrics(): {
    timestamp: string;
    errorRate: string | number;
    performanceScore: number;
    totalRequests: number;
    totalErrors: number;
    averageDuration: number;
    criticalCount: number;
    warningCount: number;
  };
  calculatePerformanceScore(): number;
}
import { BaseMiddleware } from './base.middleware';
