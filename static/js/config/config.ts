import { z } from 'zod';

// Configuration version
export const CONFIG_VERSION = '1.0.0';

// Basic validation schemas
const ApiConfigSchema = z.object({
  baseUrl: z.string(),
  timeout: z.number(),
  retries: z.number(),
});

// Middleware configuration schema
const MiddlewareConfigSchema = z
  .object({
    enabled: z.boolean(),
    logging: z.object({
      level: z.enum(['debug', 'info', 'warn', 'error']),
      format: z.enum(['json', 'text']),
      fallbackToConsole: z.boolean(),
    }),
    analytics: z.object({
      enabled: z.boolean(),
      sampleRate: z.number(),
      bufferSize: z.number(),
      flushInterval: z.number(),
    }),
    performance: z.object({
      enabled: z.boolean(),
      warningThreshold: z.number(),
      criticalThreshold: z.number(),
      sampling: z.object({
        enabled: z.boolean(),
        rate: z.number(),
      }),
    }),
  })
  .default({
    enabled: true,
    logging: {
      level: 'info',
      format: 'json',
      fallbackToConsole: true,
    },
    analytics: {
      enabled: true,
      sampleRate: 100,
      bufferSize: 100,
      flushInterval: 30000,
    },
    performance: {
      enabled: true,
      warningThreshold: 1000,
      criticalThreshold: 3000,
      sampling: {
        enabled: true,
        rate: 0.1,
      },
    },
  });

const FeatureFlagsSchema = z.object({
  analytics: z.boolean(),
  aiCoach: z.boolean(),
  spaceRepetition: z.boolean(),
  adaptiveLearning: z.boolean(),
});

const SecurityConfigSchema = z.object({
  csrfEnabled: z.boolean(),
  rateLimit: z.object({
    enabled: z.boolean(),
    maxRequests: z.number(),
    windowMs: z.number(),
  }),
});

// Export types for middleware configuration
export type MiddlewareConfig = z.infer<typeof MiddlewareConfigSchema>;

// Main configuration schema with initialization status
export const ConfigSchema = z
  .object({
    version: z.string(),
    environment: z.enum(['development', 'production', 'test']),
    api: ApiConfigSchema,
    features: FeatureFlagsSchema,
    security: SecurityConfigSchema,
    middleware: MiddlewareConfigSchema,
    initialized: z.boolean(),
  })
  .strict();

// Export the final Config type
export type Config = z.infer<typeof ConfigSchema>;

// Default configuration
const defaultConfig: Config = {
  version: CONFIG_VERSION,
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  api: {
    baseUrl: '/api',
    timeout: 30000,
    retries: 3,
  },
  features: {
    analytics: true,
    aiCoach: true,
    spaceRepetition: true,
    adaptiveLearning: true,
  },
  security: {
    csrfEnabled: true,
    rateLimit: {
      enabled: true,
      maxRequests: 100,
      windowMs: 900000,
    },
  },
  middleware: {
    enabled: true,
    logging: {
      level: 'info',
      format: 'json',
      fallbackToConsole: true,
    },
    analytics: {
      enabled: true,
      sampleRate: 100,
      bufferSize: 100,
      flushInterval: 30000,
    },
    performance: {
      enabled: true,
      warningThreshold: 1000,
      criticalThreshold: 3000,
      sampling: {
        enabled: true,
        rate: 0.1,
      },
    },
  },
  initialized: false,
};

// Type exports

class ConfigManager {
  private static instance: ConfigManager;
  private config: Config;
  private initialized: boolean = false;

  private constructor() {
    // Default configuration with initialized flag
    this.config = ConfigSchema.parse({
      version: CONFIG_VERSION,
      environment: (process.env.NODE_ENV === 'production' ? 'production' : 'development') as
        | 'development'
        | 'production'
        | 'test',
      api: {
        baseUrl: '/api',
        timeout: 30000,
        retries: 3,
      },
      features: {
        analytics: true,
        aiCoach: true,
        spaceRepetition: true,
        adaptiveLearning: true,
      },
      security: {
        csrfEnabled: true,
        rateLimit: {
          enabled: true,
          maxRequests: 100,
          windowMs: 900000,
        },
      },
      middleware: {
        enabled: true,
        logging: {
          level: 'info',
          format: 'json',
          fallbackToConsole: true,
        },
        analytics: {
          sampleRate: 100,
          bufferSize: 100,
          flushInterval: 30000,
        },
        performance: {
          warningThreshold: 1000,
          criticalThreshold: 3000,
          sampling: {
            enabled: true,
            rate: 0.1,
          },
        },
      },
      initialized: false,
    });
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('Configuration already initialized');
      return;
    }

    try {
      console.log('Initializing configuration...');

      // Load environment-specific configuration
      const envConfig = {
        version: CONFIG_VERSION,
        environment: (process.env.NODE_ENV === 'production' ? 'production' : 'development') as
          | 'development'
          | 'production'
          | 'test',
        api: {
          baseUrl: process.env.API_BASE_URL || '/api',
          timeout: parseInt(process.env.API_TIMEOUT || '30000'),
          retries: parseInt(process.env.API_RETRIES || '3'),
        },
        features: {
          analytics: process.env.FEATURE_ANALYTICS !== 'false',
          aiCoach: process.env.FEATURE_AI_COACH !== 'false',
          spaceRepetition: process.env.FEATURE_SPACE_REPETITION !== 'false',
          adaptiveLearning: process.env.FEATURE_ADAPTIVE_LEARNING !== 'false',
        },
        security: {
          csrfEnabled: process.env.SECURITY_CSRF !== 'false',
          rateLimit: {
            enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
            maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100'),
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'),
          },
        },
        initialized: false,
      };

      // Merge with default config
      this.config = {
        ...this.config,
        ...envConfig,
      };

      // Validate configuration
      const validatedConfig = ConfigSchema.parse(this.config);
      this.config = validatedConfig;
      this.initialized = true;
      console.log('Configuration initialized successfully', this.config);
    } catch (error) {
      console.error('Configuration initialization failed:', error);
      // Set safe defaults instead of throwing
      this.config = {
        version: CONFIG_VERSION,
        environment: 'development' as const,
        api: {
          baseUrl: '/api',
          timeout: 30000,
          retries: 3,
        },
        features: {
          analytics: true,
          aiCoach: true,
          spaceRepetition: true,
          adaptiveLearning: true,
        },
        security: {
          csrfEnabled: true,
          rateLimit: {
            enabled: true,
            maxRequests: 100,
            windowMs: 900000,
          },
        },
        middleware: {
          enabled: true,
          logging: {
            level: 'info',
            format: 'json',
            fallbackToConsole: true,
          },
          analytics: {
            enabled: true,
            sampleRate: 100,
            bufferSize: 100,
            flushInterval: 30000,
          },
          performance: {
            enabled: true,
            warningThreshold: 1000,
            criticalThreshold: 3000,
            sampling: {
              enabled: true,
              rate: 0.1,
            },
          },
        },
        initialized: true,
      };
      this.initialized = true;
      console.warn('Using fallback configuration due to initialization error');
    }
  }

  public getConfig(): Config {
    if (!this.initialized) {
      console.warn('Accessing configuration before initialization');
    }
    return this.config;
  }

  public isInitialized(): boolean {
    return this.initialized;
  }
}

export const configManager = ConfigManager.getInstance();
