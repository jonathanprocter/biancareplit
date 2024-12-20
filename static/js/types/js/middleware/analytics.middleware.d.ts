export class AnalyticsMiddleware extends BaseMiddleware {
  constructor(options?: {});
  options: {
    sampleRate: number;
    bufferSize: number;
    flushInterval: number;
  };
  buffer: any[];
  metrics: {
    totalRequests: number;
    errorCount: number;
    averageResponseTime: number;
    sessionData: {
      activeSessions: number;
      averageDuration: number;
    };
    userInteractions: {
      total: number;
      byType: Map<any, any>;
    };
  };
  eventEmitter: EventEmitter;
  execute(context: any, next: any): Promise<any>;
  shouldSample(): boolean;
  updateMetrics(data: any, isError?: boolean): void;
  bufferAnalytics(data: any): Promise<void>;
  flushBuffer(): Promise<void>;
  getMetrics(): {
    totalRequests: number;
    errorCount: number;
    averageResponseTime: number;
    sessionData: {
      activeSessions: number;
      averageDuration: number;
    };
    userInteractions: {
      total: number;
      byType: Map<any, any>;
    };
  };
}
import { BaseMiddleware } from './base.middleware';
import EventEmitter from '../utils/EventEmitter';
