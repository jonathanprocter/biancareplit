// Import dependencies with proper ES6 syntax
import { configManager } from '@config/system.config';
import { BaseMiddleware } from '@middleware/base.middleware';
import { LoggingMiddleware } from '@middleware/logging.middleware';
import { AnalyticsMiddleware } from '@middleware/analytics.middleware';
import { EventEmitter } from '@utils/EventEmitter';

// Ensure all required modules are available
const requiredModules = {
    configManager,
    BaseMiddleware,
    LoggingMiddleware,
    AnalyticsMiddleware,
    EventEmitter
};

Object.entries(requiredModules).forEach(([name, module]) => {
    if (!module) {
        console.error(`[MiddlewareSystem] Required module ${name} not found`);
    }
});

// Define middleware types as a constant
const middlewareTypes = {
    PRE_PROCESS: 'pre_process',
    MAIN: 'main',
    POST_PROCESS: 'post_process',
    ERROR_HANDLER: 'error_handler'
};

// Main MiddlewareSystem class implementation
class MiddlewareSystem {
    constructor() {
        this.middlewares = new Map();
        this.eventEmitter = new EventEmitter();
        this.config = configManager.getConfig()?.middleware || {};
        
        // Initialize default configurations
        this.defaultConfig = {
            maxRetries: 3,
            retryDelay: 1000,
            timeout: 5000,
            logging: {
                enabled: true,
                level: 'info'
            },
            errorHandling: {
                enabled: true,
                retryOnError: true
            },
            performance: {
                tracking: true,
                warningThreshold: 2000,
                criticalThreshold: 5000
            }
        };
        
        // Merge default config with user config
        this.config = { ...this.defaultConfig, ...this.config };
    }

    use(name, middleware, type = middlewareTypes.MAIN) {
        if (!this.middlewares.has(type)) {
            this.middlewares.set(type, new Map());
        }
        this.middlewares.get(type).set(name, middleware);
        return this;
    }

    async execute(context) {
        const startTime = performance.now();
        const config = configManager.getConfig()?.middleware || {};
        const {
            maxRetries = 3,
            retryDelay = 1000,
            timeout = 5000
        } = config;
        
        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                context.executionMetadata = {
                    startTime,
                    attempt: attempt + 1,
                    maxRetries,
                    requestId: crypto.randomUUID(),
                    performanceTracking: {
                        checkpoints: [],
                        warnings: [],
                        thresholds: {
                            warning: context.config?.performance?.warningThreshold || 2000,
                            critical: context.config?.performance?.criticalThreshold || 5000
                        }
                    }
                };

                // Execute pre-process middleware
                if (this.middlewares.has(middlewareTypes.PRE_PROCESS)) {
                    await Promise.race([
                        this.executeMiddlewareChain(middlewareTypes.PRE_PROCESS, context),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Middleware timeout')), timeout))
                    ]);
                }
            
                // Execute main middleware
                const result = await this.executeMiddlewareChain(middlewareTypes.MAIN, context);
                
                // Execute post-process middleware
                if (this.middlewares.has(middlewareTypes.POST_PROCESS)) {
                    await this.executeMiddlewareChain(middlewareTypes.POST_PROCESS, context);
                }
                
                return result;
            } catch (error) {
                attempt++;
                
                if (this.middlewares.has(middlewareTypes.ERROR_HANDLER)) {
                    try {
                        context.error = error;
                        return await this.executeMiddlewareChain(middlewareTypes.ERROR_HANDLER, context);
                    } catch (handlerError) {
                        console.error('[MiddlewareSystem] Error handler failed:', handlerError);
                        if (attempt >= maxRetries) {
                            throw handlerError;
                        }
                    }
                } else if (attempt >= maxRetries) {
                    throw error;
                }
                
                await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
            }
        }
    }

    async executeMiddlewareChain(type, context) {
        if (!this.middlewares.has(type)) {
            return context;
        }

        const middlewareChain = Array.from(this.middlewares.get(type).values());
        let index = 0;
        
        const next = async () => {
            if (index >= middlewareChain.length) {
                return context;
            }
            const middleware = middlewareChain[index++];
            return middleware.execute(context, next);
        };
        
        return next();
    }
}

// Initialize middleware system with provided config
export async function initializeMiddlewareSystem(config = {}) {
    try {
        console.log('[MiddlewareSystem] Starting initialization...');
        
        // Ensure configuration is loaded
        if (!configManager.isInitialized()) {
            await configManager.initialize();
        }
        
        const systemConfig = configManager.getConfig();
        config = {
            ...systemConfig?.middleware,
            ...config
        };

        const middlewareSystem = new MiddlewareSystem();
        
        // Initialize logging middleware
        const loggingMiddleware = new LoggingMiddleware(config.logging);
        middlewareSystem.use('logging', loggingMiddleware, middlewareTypes.PRE_PROCESS);

        // Initialize analytics middleware
        const analyticsMiddleware = new AnalyticsMiddleware(config.analytics);
        middlewareSystem.use('analytics', analyticsMiddleware, middlewareTypes.MAIN);
            
        console.log('[MiddlewareSystem] Initialized successfully');
        return middlewareSystem;
    } catch (error) {
        console.error('[MiddlewareSystem] Initialization failed:', error);
        throw error;
    }
}
