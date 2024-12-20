// Configuration Management System
import EventEmitter from '../utils/EventEmitter';

// Version tracking for configuration sync
const CONFIG_VERSION = '1.0.0';

// Configuration schema defining required fields and types
const configSchema = {
  version: 'string',
  environment: 'string',
  analytics: {
    enabled: 'boolean',
    trackingInterval: 'number',
    storageKey: 'string',
    sampling: {
      enabled: 'boolean',
      rate: 'number',
    },
  },
  aiCoach: {
    enabled: 'boolean',
    modelConfig: {
      temperature: 'number',
      maxTokens: 'number',
    },
  },
  middleware: {
    logging: 'boolean',
    errorHandling: 'boolean',
    performanceTracking: 'boolean',
    caching: 'boolean',
  },
};

// Default configuration values
const defaultConfig = {
  version: CONFIG_VERSION,
  environment: process.env.NODE_ENV || 'development',
  analytics: {
    enabled: true,
    trackingInterval: 5000,
    storageKey: 'nclexAnalytics',
    sampling: {
      enabled: true,
      rate: 1.0,
    },
  },
  aiCoach: {
    enabled: true,
    modelConfig: {
      temperature: 0.7,
      maxTokens: 500,
    },
  },
  middleware: {
    logging: true,
    errorHandling: true,
    performanceTracking: true,
    caching: true,
  },
};

class ConfigurationManager {
  constructor() {
    this.config = {};
    this.subscribers = new Set();
    this.history = [];
    this.initialized = false;
    this.eventEmitter = new EventEmitter();
    this.initialize();
  }

  initialize() {
    try {
      console.log('[ConfigurationManager] Starting initialization...');
      this.config = this.loadDefaultConfig();
      this.validateConfiguration(this.config);
      this.initialized = true;
      console.log('[ConfigurationManager] Initialized successfully');
      this.eventEmitter.emit('config:initialized', this.config);
      return true;
    } catch (error) {
      console.error('[ConfigurationManager] Initialization failed:', error);
      this.initialized = false;
      throw error;
    }
  }

  loadDefaultConfig() {
    const config = JSON.parse(JSON.stringify(defaultConfig));

    // Apply environment-specific overrides
    if (process.env.NODE_ENV === 'development') {
      config.middleware.logging = true;
      config.analytics.trackingInterval = 1000;
    }

    return config;
  }

  validateConfiguration(config, schema = configSchema) {
    for (const [key, definition] of Object.entries(schema)) {
      if (!Object.prototype.hasOwnProperty.call(config, key)) {
        throw new Error(`Missing required configuration key: ${key}`);
      }

      if (typeof definition === 'object' && !('type' in definition)) {
        this.validateConfiguration(config[key], definition);
      } else {
        const expectedType =
          typeof definition === 'string' ? definition : definition.type;
        const valueType = typeof config[key];
        if (valueType !== expectedType) {
          throw new Error(
            `Invalid type for ${key}. Expected ${expectedType}, got ${valueType}`
          );
        }
      }
    }
    return true;
  }

  get(path) {
    if (!this.initialized) {
      throw new Error('Configuration manager not initialized');
    }

    return path.split('.').reduce((obj, key) => {
      if (obj === undefined) return undefined;
      return obj[key];
    }, this.config);
  }

  set(path, value) {
    if (!this.initialized) {
      throw new Error('Configuration manager not initialized');
    }

    const keys = path.split('.');
    const lastKey = keys.pop();
    let current = this.config;

    for (const key of keys) {
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }

    const oldValue = current[lastKey];
    current[lastKey] = value;

    // Record change in history
    this.history.push({
      path,
      oldValue,
      newValue: value,
      timestamp: new Date().toISOString(),
    });

    // Emit change event
    this.eventEmitter.emit('config:changed', {
      path,
      oldValue,
      newValue: value,
    });

    return true;
  }

  getConfig() {
    if (!this.initialized) {
      throw new Error('Configuration manager not initialized');
    }
    return { ...this.config };
  }

  subscribe(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Subscriber callback must be a function');
    }
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  reset() {
    this.config = this.loadDefaultConfig();
    this.history = [];
    this.eventEmitter.emit('config:reset', this.config);
  }

  isInitialized() {
    return this.initialized;
  }
}

// Create and export singleton instance
const configManager = new ConfigurationManager();

export { configManager };
export default configManager;
