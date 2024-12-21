import { z } from 'zod';

// Get environment-specific configuration
import { CONFIG_VERSION } from './config';

// Define environment enum
export const Environment = {
  Development: 'development',
  Production: 'production',
  Test: 'test',
} as const;

export type EnvironmentType = (typeof Environment)[keyof typeof Environment];

// Environment validation schema
export const EnvironmentSchema = z.enum(['development', 'production', 'test']);

// Feature flags schema
export const FeaturesSchema = z.object({
  analytics: z.boolean(),
  aiCoach: z.boolean(),
  spaceRepetition: z.boolean(),
  adaptiveLearning: z.boolean(),
});

// Security configuration schema
export const SecuritySchema = z.object({
  csrfEnabled: z.boolean(),
  rateLimit: z.object({
    enabled: z.boolean(),
    maxRequests: z.number(),
    windowMs: z.number(),
  }),
});

// Environment configuration schema
export const EnvironmentConfigSchema = z.object({
  version: z.string(),
  apiUrl: z.string(),
  wsUrl: z.string().optional(),
  environment: EnvironmentSchema,
  debug: z.boolean(),
  enableDebugLogging: z.boolean(),
  cacheDuration: z.number(),
  features: FeaturesSchema,
  security: SecuritySchema,
});

export type Features = z.infer<typeof FeaturesSchema>;
export type Security = z.infer<typeof SecuritySchema>;
export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;

export const getEnvironmentConfig = (
  env: EnvironmentType,
): EnvironmentConfig => {
  const baseConfig = {
    version: CONFIG_VERSION,
    apiUrl: process.env.API_BASE_URL || '/api',
    environment: env,
    debug: env === Environment.Development,
    enableDebugLogging: env === Environment.Development,
    cacheDuration:
      env === Environment.Development ? 5 * 60 * 1000 : 60 * 60 * 1000,
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
  };

  switch (env) {
    case Environment.Development:
      return {
        ...baseConfig,
        wsUrl: 'ws://0.0.0.0:81/ws',
      };
    case Environment.Production:
      return {
        ...baseConfig,
        wsUrl: 'wss://api.nclex-coach.com/ws',
        debug: false,
        enableDebugLogging: false,
      };
    case Environment.Test:
      return {
        ...baseConfig,
        wsUrl: 'ws://0.0.0.0:81/ws',
        cacheDuration: 0, // No cache in test
      };
    default:
      return baseConfig;
  }
};

export const validateEnvironment = (env: string): EnvironmentType => {
  const result = EnvironmentSchema.safeParse(env);
  if (!result.success) {
    console.warn(`Invalid environment '${env}', falling back to development`);
    return Environment.Development;
  }
  return result.data as EnvironmentType;
};

export const getCurrentEnvironment = (): EnvironmentType => {
  const env = process.env.NODE_ENV || 'development';
  return validateEnvironment(env);
};
