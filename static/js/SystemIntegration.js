// Core system integration module
import { EventEmitter } from './utils/EventEmitter.js';
import { configManager } from './config/system.config.js';

// Ensure EventEmitter is available
if (!EventEmitter) {
  console.error('[SystemIntegration] EventEmitter not found, using fallback');
  // Simple fallback implementation
  class FallbackEventEmitter {
    constructor() {
      this.events = new Map();
    }
    emit(event, ...args) {
      const handlers = this.events.get(event);
      if (handlers) {
        handlers.forEach(handler => handler(...args));
      }
    }
    on(event, handler) {
      if (!this.events.has(event)) {
        this.events.set(event, new Set());
      }
      this.events.get(event).add(handler);
    }
  }
  window.EventEmitter = FallbackEventEmitter;
}

class SystemIntegration {
  constructor() {
    this.configManager = configManager;
    this.eventEmitter = new EventEmitter();
    this.eventEmitter = new EventEmitter();
    this.initialized = false;
    this.analyticsReady = false;
    this.middlewareSystem = null;
    this.services = new Map();
    this.defaultConfig = {
      telemetry: {
        enabled: true,
        sampleRate: 100,
        logLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        updateInterval: 30000,
        errorTracking: true,
        metricsEnabled: true,
        batchSize: 50,
        flushInterval: 10000,
      },
      middleware: {
        logging: {
          enabled: true,
          level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
          format: 'json',
          fallbackToConsole: true,
        },
        performance: {
          enabled: true,
          warningThreshold: 2000,
          criticalThreshold: 5000,
          samplingRate: 0.1,
        },
        analytics: {
          enabled: true,
          realtime: true,
          updateInterval: 30000,
          batchSize: 50,
        },
      },
    };
    this.wsUrl = null;
    this.wsConfig = {};
    this.wsState = {};
    this.ws = null;
    this.wsConnected = false;
    this.wsReconnectAttempts = 0;
    this.wsReconnectTimer = null;
    this.wsReconnectDelay = 2000;
    this.wsReconnectBackoff = 1.5;
    this.wsMaxReconnectAttempts = 5;
    this.pingInterval = null;
  }

  validateConfiguration(config) {
    try {
      if (!config || typeof config !== 'object') {
        throw new Error(
          '[SystemIntegration] Invalid configuration: must be an object'
        );
      }

      // Schema for validation
      const configSchema = {
        middleware: {
          logging: {
            enabled: { type: 'boolean', default: true },
            level: { type: 'string', default: 'info' },
            format: { type: 'string', default: 'json' },
            fallbackToConsole: { type: 'boolean', default: true },
          },
          performance: {
            enabled: { type: 'boolean', default: true },
            warningThreshold: { type: 'number', default: 2000 },
            criticalThreshold: { type: 'number', default: 5000 },
            samplingRate: { type: 'number', default: 0.1 },
          },
          analytics: {
            enabled: { type: 'boolean', default: true },
            realtime: { type: 'boolean', default: true },
            updateInterval: { type: 'number', default: 30000 },
            batchSize: { type: 'number', default: 100 },
          },
        },
        telemetry: {
          enabled: { type: 'boolean', default: true },
          sampleRate: { type: 'number', default: 100 },
          logLevel: { type: 'string', default: 'info' },
          updateInterval: { type: 'number', default: 60000 },
          errorTracking: { type: 'boolean', default: true },
          metricsEnabled: { type: 'boolean', default: true },
        },
      };

      // Validation helper function
      const validateSection = (schema, data, path = '') => {
        const validated = {};

        Object.entries(schema).forEach(([key, definition]) => {
          const currentPath = path ? `${path}.${key}` : key;
          const value = data?.[key];

          if (typeof definition === 'object' && !('type' in definition)) {
            // Nested configuration object
            validated[key] = validateSection(definition, value, currentPath);
          } else {
            // Leaf configuration value
            if (value === undefined) {
              console.log(
                `[SystemIntegration] Using default value for ${currentPath}`
              );
              validated[key] = definition.default;
            } else {
              const actualType = typeof value;
              if (actualType !== definition.type) {
                throw new Error(
                  `Invalid type for ${currentPath}. Expected ${definition.type}, got ${actualType}`
                );
              }
              validated[key] = value;
            }
          }
        });

        return validated;
      };

      // Merge default configuration with provided config
      const mergedConfig = this.deepMerge(this.getDefaultConfig(), config);

      // Validate and normalize configuration
      const validatedConfig = validateSection(configSchema, mergedConfig);
      console.log('[SystemIntegration] Configuration validated successfully');

      return validatedConfig;
    } catch (error) {
      console.error(
        '[SystemIntegration] Configuration validation failed:',
        error
      );
      throw error;
    }
  }

  getDefaultConfig() {
    return {
      middleware: {
        logging: {
          enabled: true,
          level: 'info',
          format: 'json',
          fallbackToConsole: true,
        },
        performance: {
          enabled: true,
          warningThreshold: 2000,
          criticalThreshold: 5000,
          samplingRate: 0.1,
        },
        analytics: {
          enabled: true,
          realtime: true,
          updateInterval: 30000,
          batchSize: 100,
        },
      },
      telemetry: {
        enabled: true,
        sampleRate: 100,
        logLevel: 'info',
        updateInterval: 60000,
        errorTracking: true,
        metricsEnabled: true,
      },
    };
  }

  deepMerge(target, source) {
    const output = Object.assign({}, target);
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }

  isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  async initialize(config = {}) {
    if (this.initialized) {
      console.log('[SystemIntegration] Already initialized');
      return { success: true, status: 'already_initialized' };
    }

    try {
      console.log('[SystemIntegration] Starting initialization...');

      // Set up error handlers first for better debugging
      this.setupErrorHandlers();

      // Initialize configuration with defaults and provided config
      const initialConfig = await this.initializeConfiguration(config);
      if (!initialConfig) {
        throw new Error(
          'Configuration initialization failed: no configuration returned'
        );
      }

      // Validate the configuration before proceeding
      const validatedConfig = await this.validateConfiguration(initialConfig);
      if (!validatedConfig) {
        throw new Error('Configuration validation failed after initialization');
      }

      console.log(
        '[SystemIntegration] Configuration initialized successfully:',
        {
          version: validatedConfig.version,
          environment: process.env.NODE_ENV,
          features: Object.keys(validatedConfig),
        }
      );

      // Initialize middleware system with enhanced error handling and retries
      const initializeMiddleware = async (retryCount = 0) => {
        try {
          const { initializeMiddlewareSystem } = await import(
            './middleware/system.middleware.js'
          );
          const middlewareInitResult = await initializeMiddlewareSystem(
            initialConfig
          );

          if (!middlewareInitResult?.success) {
            throw new Error(
              middlewareInitResult?.error ||
                'Middleware initialization failed without error details'
            );
          }

          this.middlewareSystem = middlewareInitResult.system;
          console.log(
            '[SystemIntegration] Middleware system initialized successfully'
          );

          // Initialize core services with timeout
          await Promise.race([
            this.initializeCoreServices(initialConfig),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error('Core services initialization timeout')),
                initialConfig.initialization?.timeout || 10000
              )
            ),
          ]);

          this.initialized = true;
          return {
            success: true,
            status: 'initialized',
            config: initialConfig,
            middlewareStatus: middlewareInitResult,
            initializationTime: new Date().toISOString(),
          };
        } catch (error) {
          console.error('[SystemIntegration] Initialization error:', {
            message: error.message,
            stack: error.stack,
            retryCount,
          });

          // Emit error event for monitoring
          this.eventEmitter.emit('initialization_error', {
            error: error.message,
            stack: error.stack,
            retryCount,
            timestamp: new Date().toISOString(),
          });

          // Retry logic
          const maxRetries = initialConfig.initialization?.retryAttempts || 3;
          if (retryCount < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
            await new Promise(resolve => setTimeout(resolve, delay));
            return initializeMiddleware(retryCount + 1);
          }

          throw new Error(
            `System initialization failed after ${retryCount} retries: ${error.message}`
          );
        }
      };

      const initializationResult = await initializeMiddleware();

      this.setupEventHandlers();

      // Initialize analytics if enabled
      if (initialConfig.analytics?.enabled) {
        await this.initializeAnalytics();
        this.analyticsReady = true;
      }

      this.wsUrl =
        initialConfig.wsUrl ||
        process.env.REACT_APP_WS_URL ||
        `ws://${window.location.hostname}:81/ws`;
      this.wsConfig = {
        maxReconnectAttempts: initialConfig.websocket?.reconnectAttempts || 5,
        reconnectDelay: initialConfig.websocket?.reconnectDelay || 2000,
        heartbeatInterval: initialConfig.websocket?.heartbeatInterval || 30000,
        enabled: initialConfig.websocket?.enabled !== false,
        debug: process.env.NODE_ENV === 'development',
      };
      this.wsState = {
        reconnectAttempts: 0,
        reconnectTimer: null,
        connected: false,
        lastError: null,
        backoffMultiplier: 1.5,
        currentDelay: this.wsConfig.reconnectDelay,
      };

      if (this.wsConfig.enabled) {
        const initializeWebSocket = async () => {
          if (this.wsState.reconnectTimer) {
            clearTimeout(this.wsState.reconnectTimer);
          }
          try {
            if (this.ws) {
              this.ws.close();
            }
            console.log(
              `[SystemIntegration] Attempting WebSocket connection to ${this.wsUrl}`
            );
            this.ws = new WebSocket(this.wsUrl);
            const connectionTimeout = setTimeout(() => {
              if (this.ws.readyState !== WebSocket.OPEN) {
                console.warn(
                  '[SystemIntegration] WebSocket connection timeout'
                );
                this.ws.close();
                this._scheduleReconnection();
              }
            }, 5000);
            this.ws.onmessage = event => {
              try {
                const data = JSON.parse(event.data);
                this._handleWebSocketMessage(data);
                this.wsReconnectAttempts = 0;
              } catch (error) {
                console.warn(
                  '[SystemIntegration] WebSocket message parse error:',
                  error
                );
                this.eventEmitter.emit('websocket_message_error', {
                  error: error.message,
                  data: event.data,
                  timestamp: new Date().toISOString(),
                });
              }
            };
            this.ws.onerror = error => {
              const errorMessage = error.message || 'Unknown WebSocket error';
              console.warn(
                '[SystemIntegration] WebSocket error:',
                errorMessage
              );
              this.eventEmitter.emit('websocket_error', {
                error: errorMessage,
                attempt: this.wsReconnectAttempts + 1,
                maxAttempts: this.wsMaxReconnectAttempts,
                timestamp: new Date().toISOString(),
              });
              if (!this.wsConnected) {
                this._scheduleReconnection();
              }
            };
            this.pingInterval = setInterval(() => {
              if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping' }));
              }
            }, 30000);
            this.ws.onclose = event => {
              this.wsState.connected = false;
              if (this.pingInterval) {
                clearInterval(this.pingInterval);
                this.pingInterval = null;
              }
              const wasExpected = event.wasClean && event.code === 1000;
              console.log(
                '[SystemIntegration] WebSocket connection closed',
                wasExpected ? 'cleanly' : 'unexpectedly',
                'code:',
                event.code
              );
              this.eventEmitter.emit('websocket_closed', {
                timestamp: new Date().toISOString(),
                reconnectAttempt: this.wsState.reconnectAttempts + 1,
                maxAttempts: this.wsConfig.maxReconnectAttempts,
                wasClean: event.wasClean,
                code: event.code,
                reason: event.reason || 'No reason provided',
              });
              if (
                !wasExpected &&
                this.wsState.reconnectAttempts <
                  this.wsConfig.maxReconnectAttempts
              ) {
                const baseDelay = this.wsConfig.reconnectDelay;
                const maxDelay = Math.min(
                  baseDelay * Math.pow(2, this.wsState.reconnectAttempts),
                  30000
                );
                const jitter = Math.random() * 1000;
                this.wsState.currentDelay = Math.min(maxDelay + jitter, 30000);
                this._scheduleReconnection();
              } else if (
                this.wsState.reconnectAttempts >=
                this.wsConfig.maxReconnectAttempts
              ) {
                console.error(
                  '[SystemIntegration] Max reconnection attempts reached'
                );
                this.eventEmitter.emit('websocket_max_retries', {
                  timestamp: new Date().toISOString(),
                  attempts: this.wsState.reconnectAttempts,
                  finalDelay: this.wsState.currentDelay,
                });
              }
            };
            this.ws.onopen = () => {
              console.log(
                '[SystemIntegration] WebSocket connected successfully'
              );
              this.wsConnected = true;
              this.wsReconnectAttempts = 0;
              this.eventEmitter.emit('websocket_connected', {
                timestamp: new Date().toISOString(),
                url: this.wsUrl,
              });
              this._sendHeartbeat();
            };
          } catch (error) {
            console.error(
              '[SystemIntegration] WebSocket initialization error:',
              error
            );
            this.eventEmitter.emit('websocket_failed', {
              error: error.message,
              timestamp: new Date().toISOString(),
            });
            this._scheduleReconnection();
          }
        };
        initializeWebSocket();
      }

      console.log('[SystemIntegration] System initialized successfully');
      return {
        success: true,
        status: 'initialized',
        analyticsReady: this.analyticsReady,
        ...initializationResult,
      };
    } catch (error) {
      console.error('[SystemIntegration] Initialization failed:', error);
      throw error;
    }
  }

  initializeConfiguration(config) {
    try {
      console.log('[SystemIntegration] Initializing configuration...');
      const validatedConfig = this.validateConfiguration(config);
      this.configManager.setConfig(validatedConfig);
      console.log('[SystemIntegration] Configuration initialized successfully');
      return validatedConfig;
    } catch (error) {
      console.error(
        '[SystemIntegration] Configuration initialization failed:',
        error
      );
      throw error;
    }
  }

  setupEventHandlers() {
    this.eventEmitter.on('configUpdated', config => {
      console.log('[SystemIntegration] Configuration updated:', config);
    });
  }

  getConfig() {
    return this.configManager.getConfig();
  }

  updateConfig(newConfig) {
    const currentConfig = this.getConfig();
    const updatedConfig = this.deepMerge(currentConfig, newConfig);
    const validatedConfig = this.validateConfiguration(updatedConfig);

    this.configManager.setConfig(validatedConfig);
    this.eventEmitter.emit('configUpdated', validatedConfig);

    return validatedConfig;
  }

  async initializeAnalytics() {
    if (!this.configManager.get('analytics.enabled')) {
      console.log('[SystemIntegration] Analytics disabled by configuration');
      return false;
    }

    try {
      // Attempt to initialize analytics with retry logic
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          await this.middlewareSystem.execute({
            operation: 'analytics_initialization',
            timestamp: new Date().toISOString(),
            retryAttempt: retryCount,
          });

          this.analyticsReady = true;
          console.log('[SystemIntegration] Analytics initialized successfully');
          return true;
        } catch (retryError) {
          retryCount++;
          if (retryCount < maxRetries) {
            console.warn(
              `[SystemIntegration] Analytics initialization retry ${retryCount}/${maxRetries}`
            );
            await new Promise(resolve =>
              setTimeout(resolve, 1000 * retryCount)
            );
          } else {
            throw retryError;
          }
        }
      }
    } catch (error) {
      console.error(
        '[SystemIntegration] Analytics initialization failed:',
        error
      );
      // Set to minimal analytics mode instead of completely failing
      this.analyticsReady = false;
      this.eventEmitter.emit('analytics_fallback', {
        reason: error.message,
        timestamp: new Date().toISOString(),
      });
      // Don't throw, return false to indicate initialization failed but system can continue
      return false;
    }
  }

  setupErrorHandlers() {
    // Setup error handlers first for better debugging
    window.onerror = (message, source, lineno, colno, error) => {
      this.eventEmitter.emit('system_error', {
        type: 'runtime_error',
        message,
        source,
        lineno,
        colno,
        error: error?.stack,
        timestamp: new Date().toISOString(),
      });
    };

    window.onunhandledrejection = event => {
      this.eventEmitter.emit('system_error', {
        type: 'unhandled_promise',
        message: event.reason?.message || 'Unhandled Promise rejection',
        error: event.reason?.stack,
        timestamp: new Date().toISOString(),
      });
    };
  }

  async initializeCoreServices(config) {
    //Implementation for initializing core services
    console.log('[SystemIntegration] Core services initialized');
  }

  _handleWebSocketMessage(data) {
    //Implementation for handling websocket messages
  }

  _sendHeartbeat = () => {
    if (this.wsConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'heartbeat' }));
      setTimeout(this._sendHeartbeat, 30000); // Send heartbeat every 30 seconds
    }
  };

  _scheduleReconnection = () => {
    const { reconnectAttempts, maxReconnectAttempts } = this.wsState;

    if (reconnectAttempts >= (maxReconnectAttempts || 5)) {
      console.error('[SystemIntegration] Max reconnection attempts reached');
      this.eventEmitter.emit('websocket_failed', {
        timestamp: new Date().toISOString(),
        attempts: reconnectAttempts,
        message: 'Maximum reconnection attempts exceeded',
      });
      return;
    }

    const baseDelay = this.wsConfig.reconnectDelay || 2000;
    const backoff = this.wsState.backoffMultiplier || 1.5;
    const maxDelay = 30000; // 30 seconds maximum delay

    // Calculate delay with exponential backoff and jitter
    const exponentialDelay = baseDelay * Math.pow(backoff, reconnectAttempts);
    const jitter = Math.random() * 1000;
    const delay = Math.min(exponentialDelay + jitter, maxDelay);

    console.log(
      `[SystemIntegration] Scheduling reconnection attempt ${
        reconnectAttempts + 1
      }/${maxReconnectAttempts} in ${delay}ms`
    );

    this.wsState.reconnectAttempts++;
    this.wsState.reconnectTimer = setTimeout(() => {
      if (!this.wsState.connected) {
        this.initializeWebSocket().catch(error => {
          console.error(
            '[SystemIntegration] Reconnection attempt failed:',
            error
          );
          this._scheduleReconnection();
        });
      }
    }, delay);

    // Update state
    this.wsState.currentDelay = delay;
    this.wsState.lastReconnectAttempt = Date.now();
  };

  initializeWebSocket = async () => {
    if (!this.wsConfig.enabled) return;

    if (this.wsState.reconnectTimer) {
      clearTimeout(this.wsState.reconnectTimer);
      this.wsState.reconnectTimer = null;
    }

    try {
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }

      console.log(
        `[SystemIntegration] Attempting WebSocket connection to ${this.wsUrl}`
      );
      this.ws = new WebSocket(this.wsUrl);

      // Clear existing connection timeout if any
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
      }

      // Set new connection timeout
      this.connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
          console.warn('[SystemIntegration] WebSocket connection timeout');
          this.ws.close();
          this._scheduleReconnection();
        }
      }, this.wsConfig.connectionTimeout || 5000);

      this.ws.onmessage = event => {
        try {
          if (typeof event.data === 'string') {
            const data = JSON.parse(event.data);
            this._handleWebSocketMessage(data);
            // Reset reconnection attempts on successful message
            this.wsState.reconnectAttempts = 0;
            this.wsState.lastMessageTime = Date.now();
          }
        } catch (error) {
          console.warn(
            '[SystemIntegration] WebSocket message parse error:',
            error
          );
          this.eventEmitter.emit('websocket_message_error', {
            error: error.message,
            data: event.data,
            timestamp: new Date().toISOString(),
          });
        }
      };

      this.ws.onerror = error => {
        const errorMessage = error.message || 'Unknown WebSocket error';
        console.warn('[SystemIntegration] WebSocket error:', errorMessage);
        this.eventEmitter.emit('websocket_error', {
          error: errorMessage,
          attempt: this.wsReconnectAttempts + 1,
          maxAttempts: this.wsMaxReconnectAttempts,
          timestamp: new Date().toISOString(),
        });
        if (!this.wsConnected) {
          this._scheduleReconnection();
        }
      };

      this.pingInterval = setInterval(() => {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);

      this.ws.onclose = event => {
        this.wsState.connected = false;
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
          this.pingInterval = null;
        }
        const wasExpected = event.wasClean && event.code === 1000;
        console.log(
          '[SystemIntegration] WebSocket connection closed',
          wasExpected ? 'cleanly' : 'unexpectedly',
          'code:',
          event.code
        );
        this.eventEmitter.emit('websocket_closed', {
          timestamp: new Date().toISOString(),
          reconnectAttempt: this.wsState.reconnectAttempts + 1,
          maxAttempts: this.wsConfig.maxReconnectAttempts,
          wasClean: event.wasClean,
          code: event.code,
          reason: event.reason || 'No reason provided',
        });
        if (
          !wasExpected &&
          this.wsState.reconnectAttempts < this.wsConfig.maxReconnectAttempts
        ) {
          const baseDelay = this.wsConfig.reconnectDelay;
          const maxDelay = Math.min(
            baseDelay * Math.pow(2, this.wsState.reconnectAttempts),
            30000
          );
          const jitter = Math.random() * 1000;
          this.wsState.currentDelay = Math.min(maxDelay + jitter, 30000);
          this._scheduleReconnection();
        } else if (
          this.wsState.reconnectAttempts >= this.wsConfig.maxReconnectAttempts
        ) {
          console.error(
            '[SystemIntegration] Max reconnection attempts reached'
          );
          this.eventEmitter.emit('websocket_max_retries', {
            timestamp: new Date().toISOString(),
            attempts: this.wsState.reconnectAttempts,
            finalDelay: this.wsState.currentDelay,
          });
        }
      };

      this.ws.onopen = () => {
        console.log('[SystemIntegration] WebSocket connected successfully');
        this.wsConnected = true;
        this.wsReconnectAttempts = 0;
        this.eventEmitter.emit('websocket_connected', {
          timestamp: new Date().toISOString(),
          url: this.wsUrl,
        });
        this._sendHeartbeat();
      };
    } catch (error) {
      console.error(
        '[SystemIntegration] WebSocket initialization error:',
        error
      );
      this.eventEmitter.emit('websocket_failed', {
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      this._scheduleReconnection();
    }
  };

  static getInstance() {
    if (!SystemIntegration.instance) {
      SystemIntegration.instance = new SystemIntegration();
    }
    return SystemIntegration.instance;
  }
}

// Create and export singleton instance
const systemIntegration = new SystemIntegration();

// Export both the singleton instance and the class
export { systemIntegration as default };
export { SystemIntegration };

// For backwards compatibility
if (typeof window !== 'undefined') {
  window.systemIntegration = systemIntegration;
}
