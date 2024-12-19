import { performanceMonitor } from './performance-monitor';
import { singletonManager } from './singleton-manager';

class AnalyticsManager {
  constructor() {
    if (singletonManager.hasInstance('analyticsManager')) {
      return singletonManager.getInstance('analyticsManager');
    }

    this.initialized = false;
    this.performanceMonitor = performanceMonitor;
    this.cleanupListeners = new Set();
    this.initialize();
  }

  initialize() {
    if (this.initialized) {
      return;
    }

    console.log('Initializing analytics dashboard...');
    
    // Track initial page load performance
    if (typeof window !== 'undefined' && window.performance) {
      const navigationEntries = performance.getEntriesByType('navigation');
      if (navigationEntries.length > 0) {
        const navigationEntry = navigationEntries[0];
        this.performanceMonitor.trackCustomMeasure({
          name: 'page-load',
          duration: navigationEntry.duration,
          metadata: {
            domComplete: navigationEntry.domComplete,
            domInteractive: navigationEntry.domInteractive,
            loadEventEnd: navigationEntry.loadEventEnd
          }
        });
      }
    }

    // Setup performance tracking for route changes
    if (typeof window !== 'undefined' && window.PerformanceObserver) {
      let lastRenderTimestamp = performance.now();
      
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'measure') {
            this.performanceMonitor.trackCustomMeasure({
              name: entry.name,
              duration: entry.duration,
              metadata: {
                startTime: entry.startTime,
                renderTime: performance.now() - lastRenderTimestamp
              }
            });
          }
        });
        lastRenderTimestamp = performance.now();
      });

      // Safely observe performance entries
      if (typeof observer.observe === 'function') {
        observer.observe({ entryTypes: ['measure', 'resource', 'paint'] });
      }
    }
    
    // Add window event listeners with cleanup
    if (typeof document !== 'undefined') {
      const handleVisibilityChange = () => {
        this.performanceMonitor.trackCustomMeasure({
          name: 'visibility-change',
          value: document.hidden ? 'hidden' : 'visible'
        });
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      this.cleanupListeners.add(() => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      });
    }

    this.initialized = true;
    console.log('Analytics dashboard initialized successfully');
  }

  cleanup() {
    this.cleanupListeners.forEach(cleanup => cleanup());
    this.cleanupListeners.clear();
    this.initialized = false;
  }
}

// Export singleton instance
export const analyticsManager = singletonManager.getInstance(
  'analyticsManager',
  () => new AnalyticsManager()
);

export default analyticsManager;
