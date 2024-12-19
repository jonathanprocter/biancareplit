import EventEmitter from '../utils/EventEmitter';
import { BaseMiddleware } from './base.middleware';

export class AnalyticsMiddleware extends BaseMiddleware {
    constructor(options = {}) {
        super({
            name: 'AnalyticsMiddleware',
            priority: 3,
            ...options
        });

        this.options = {
            sampleRate: 100,
            bufferSize: 100,
            flushInterval: 30000,
            ...options
        };

        this.buffer = [];
        this.metrics = {
            totalRequests: 0,
            errorCount: 0,
            averageResponseTime: 0,
            sessionData: {
                activeSessions: 0,
                averageDuration: 0
            },
            userInteractions: {
                total: 0,
                byType: new Map()
            }
        };

        this.eventEmitter = new EventEmitter();
        
        // Set up periodic buffer flush
        setInterval(() => {
            this.flushBuffer();
        }, this.options.flushInterval);
    }

    async execute(context, next) {
        if (!this.shouldSample()) {
            return next();
        }

        const startTime = performance.now();
        const analyticsData = {
            timestamp: new Date().toISOString(),
            requestId: context.requestId || crypto.randomUUID(),
            sessionId: context.sessionId,
            type: context.type || 'request',
            status: 'success',
            duration: 0,
            performance: {}
        };

        try {
            const result = await next();
            const duration = performance.now() - startTime;
            analyticsData.duration = duration;

            this.updateMetrics(analyticsData);
            await this.bufferAnalytics(analyticsData);

            return result;
        } catch (error) {
            const duration = performance.now() - startTime;
            analyticsData.status = 'error';
            analyticsData.error = {
                message: error.message,
                type: error.name
            };

            this.updateMetrics(analyticsData, true);
            await this.bufferAnalytics(analyticsData);
            throw error;
        }
    }

    shouldSample() {
        return Math.random() * 100 <= this.options.sampleRate;
    }

    updateMetrics(data, isError = false) {
        this.metrics.totalRequests++;
        if (isError) {
            this.metrics.errorCount++;
        }
        
        const oldAvg = this.metrics.averageResponseTime;
        const oldCount = this.metrics.totalRequests - 1;
        this.metrics.averageResponseTime = 
            (oldAvg * oldCount + data.duration) / this.metrics.totalRequests;
    }

    async bufferAnalytics(data) {
        this.buffer.push(data);
        
        if (this.buffer.length >= this.options.bufferSize) {
            await this.flushBuffer();
        }
    }

    async flushBuffer() {
        if (this.buffer.length === 0) return;

        const analytics = [...this.buffer];
        this.buffer = [];

        try {
            this.eventEmitter.emit('analytics_batch', {
                timestamp: new Date().toISOString(),
                metrics: { ...this.metrics },
                data: analytics
            });
        } catch (error) {
            console.error('[AnalyticsMiddleware] Error flushing analytics:', error);
            this.buffer = [...analytics, ...this.buffer];
        }
    }

    getMetrics() {
        return { ...this.metrics };
    }
}

// End of file