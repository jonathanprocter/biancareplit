import { singletonManager } from './singleton-manager';

// Performance monitoring utilities
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      bundleSize: new Map(),
      loadTimes: [],
      resourceUsage: new Map(),
      componentMetrics: new Map(),
    };

    this.setupPerformanceObserver();
  }

  setupPerformanceObserver() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processPerformanceEntry(entry);
        }
      });

      observer.observe({ entryTypes: ['resource', 'measure', 'paint'] });
    }
  }

  processPerformanceEntry(entry) {
    switch (entry.entryType) {
      case 'resource':
        this.trackResourceTiming(entry);
        break;
      case 'measure':
        this.trackCustomMeasure(entry);
        break;
      case 'paint':
        this.trackPaintTiming(entry);
        break;
    }
  }

  trackComponentRender(componentName, duration) {
    const metrics = this.metrics.componentMetrics.get(componentName) || {
      renders: 0,
      totalDuration: 0,
      averageDuration: 0,
    };

    metrics.renders += 1;
    metrics.totalDuration += duration;
    metrics.averageDuration = metrics.totalDuration / metrics.renders;

    this.metrics.componentMetrics.set(componentName, metrics);
    console.log(
      `[Performance] Component ${componentName} rendered in ${duration}ms`,
    );
  }

  trackResourceTiming(entry) {
    const size = entry.transferSize || entry.decodedBodySize;
    if (size) {
      this.metrics.bundleSize.set(entry.name, size);
    }
  }

  trackCustomMeasure(entry) {
    // Enhanced tracking with more detailed metrics
    const measure = {
      name: entry.name,
      duration: entry.duration || 0,
      timestamp: new Date(),
      error: entry.error,
      metadata: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        performance: {
          memory: performance.memory
            ? {
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
              }
            : null,
          navigation: performance.getEntriesByType('navigation')[0],
          resources: performance.getEntriesByType('resource').slice(-5),
        },
      },
    };

    this.metrics.loadTimes.push(measure);

    // Log performance issues
    if (measure.duration > 1000) {
      console.warn(
        `Performance warning: ${measure.name} took ${measure.duration}ms`,
      );
    }

    return measure;
  }

  trackPaintTiming(entry) {
    console.log(
      `[Performance] ${entry.name}: ${Math.round(entry.startTime)}ms`,
    );
  }

  getMetrics() {
    return {
      bundleSizes: Object.fromEntries(this.metrics.bundleSize),
      loadTimes: this.metrics.loadTimes,
      componentMetrics: Object.fromEntries(this.metrics.componentMetrics),
      resourceUtilization: Object.fromEntries(this.metrics.resourceUsage),
    };
  }

  generateReport() {
    const metrics = this.getMetrics();
    return {
      timestamp: new Date().toISOString(),
      ...metrics,
      summary: {
        totalBundleSize: Object.values(metrics.bundleSizes).reduce(
          (a, b) => a + b,
          0,
        ),
        averageLoadTime:
          metrics.loadTimes.reduce((acc, curr) => acc + curr.duration, 0) /
            metrics.loadTimes.length || 0,
        componentsTracked: Object.keys(metrics.componentMetrics).length,
      },
    };
  }
}

// Get or create performance monitor instance
export const performanceMonitor = singletonManager.getInstance(
  'performanceMonitor',
  () => new PerformanceMonitor(),
);
export default performanceMonitor;
