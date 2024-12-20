class EventEmitter {
  constructor() {
    this.events = new Map();
    this.onceEvents = new Map();
    this._maxListeners = 10;
    this._listenerCounts = new Map();
    this._warnings = new Set();
    this._debugMode =
      typeof process !== 'undefined' &&
      process.env &&
      process.env.NODE_ENV === 'development';

    // Initialize with basic error handling
    this.on('error', error => {
      console.error('[EventEmitter] Unhandled error:', error);
    });
  }

  _handleConfigChange(config) {
    if (this._debugMode) {
      console.log('[EventEmitter] Configuration changed:', config);
    }
  }

  _handleConfigError(error) {
    console.error('[EventEmitter] Configuration error:', error);
    // Emit a system-wide error event
    this.emit('system.error', {
      type: 'ConfigurationError',
      error: error,
      timestamp: new Date().toISOString(),
    });
  }

  setMaxListeners(n) {
    if (typeof n !== 'number' || n < 0 || Number.isNaN(n)) {
      throw new TypeError(
        'The value of "n" is out of range. It must be a non-negative number.'
      );
    }
    this._maxListeners = n;
    return this;
  }

  getMaxListeners() {
    return this._maxListeners;
  }

  _addListener(eventMap, event, listener, prepend = false) {
    if (typeof listener !== 'function') {
      throw new TypeError('The listener must be a function');
    }

    if (!eventMap.has(event)) {
      eventMap.set(event, new Set());
    }
    const listeners = eventMap.get(event);

    // Update listener count and check limits
    const currentCount = (this._listenerCounts.get(event) || 0) + 1;
    this._listenerCounts.set(event, currentCount);

    if (currentCount > this._maxListeners && !this._warnings.has(event)) {
      console.warn(
        `MaxListenersExceededWarning: Possible EventEmitter memory leak detected. ${currentCount} ${event} listeners added. Use emitter.setMaxListeners() to increase limit`
      );
      this._warnings.add(event);
    }

    listeners.add(listener);
    return () => this.off(event, listener);
  }

  on(event, listener) {
    return this._addListener(this.events, event, listener);
  }

  off(event, listener) {
    if (!this.events.has(event)) return;
    const listeners = this.events.get(event);
    const removed = listeners.delete(listener);

    if (removed) {
      const currentCount = this._listenerCounts.get(event) - 1;
      this._listenerCounts.set(event, currentCount);
      if (currentCount <= this._maxListeners) {
        this._warnings.delete(event);
      }
    }

    if (listeners.size === 0) {
      this.events.delete(event);
      this._listenerCounts.delete(event);
      this._warnings.delete(event);
    }
  }

  emit(event, ...args) {
    const listeners = this.events.get(event);
    const onceListeners = this.onceEvents.get(event);

    let handled = false;

    if (listeners) {
      handled = true;
      listeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }

    if (onceListeners) {
      handled = true;
      onceListeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in once event listener for ${event}:`, error);
        }
      });
      this.onceEvents.delete(event);
      this._listenerCounts.set(
        event,
        (this._listenerCounts.get(event) || 0) - onceListeners.size
      );
    }

    return handled;
  }

  once(event, listener) {
    return this._addListener(this.onceEvents, event, listener);
  }

  removeAllListeners(event) {
    if (event) {
      if (this.events.has(event)) {
        this.events.delete(event);
        this._listenerCounts.delete(event);
        this._warnings.delete(event);
      }
      if (this.onceEvents.has(event)) {
        this.onceEvents.delete(event);
      }
    } else {
      this.events.clear();
      this.onceEvents.clear();
      this._listenerCounts.clear();
      this._warnings.clear();
    }
    return this;
  }

  listenerCount(event) {
    return (
      (this.events.get(event)?.size || 0) +
      (this.onceEvents.get(event)?.size || 0)
    );
  }

  rawListeners(event) {
    const regular = Array.from(this.events.get(event) || []);
    const once = Array.from(this.onceEvents.get(event) || []);
    return [...regular, ...once];
  }
}

if (typeof window !== 'undefined') {
  window.EventEmitter = EventEmitter;
}

export { EventEmitter };
export default EventEmitter;
