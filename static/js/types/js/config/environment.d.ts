import { z } from 'zod';
export declare const Environment: {
  readonly Development: 'development';
  readonly Production: 'production';
  readonly Test: 'test';
};
export type EnvironmentType = (typeof Environment)[keyof typeof Environment];
export declare const EnvironmentSchema: z.ZodEnum<['development', 'production', 'test']>;
export declare const FeaturesSchema: z.ZodObject<
  {
    analytics: z.ZodBoolean;
    aiCoach: z.ZodBoolean;
    spaceRepetition: z.ZodBoolean;
    adaptiveLearning: z.ZodBoolean;
  },
  'strip',
  z.ZodTypeAny,
  {
    analytics: boolean;
    aiCoach: boolean;
    spaceRepetition: boolean;
    adaptiveLearning: boolean;
  },
  {
    analytics: boolean;
    aiCoach: boolean;
    spaceRepetition: boolean;
    adaptiveLearning: boolean;
  }
>;
export declare const SecuritySchema: z.ZodObject<
  {
    csrfEnabled: z.ZodBoolean;
    rateLimit: z.ZodObject<
      {
        enabled: z.ZodBoolean;
        maxRequests: z.ZodNumber;
        windowMs: z.ZodNumber;
      },
      'strip',
      z.ZodTypeAny,
      {
        enabled: boolean;
        maxRequests: number;
        windowMs: number;
      },
      {
        enabled: boolean;
        maxRequests: number;
        windowMs: number;
      }
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    csrfEnabled: boolean;
    rateLimit: {
      enabled: boolean;
      maxRequests: number;
      windowMs: number;
    };
  },
  {
    csrfEnabled: boolean;
    rateLimit: {
      enabled: boolean;
      maxRequests: number;
      windowMs: number;
    };
  }
>;
export declare const EnvironmentConfigSchema: z.ZodObject<
  {
    version: z.ZodString;
    apiUrl: z.ZodString;
    wsUrl: z.ZodOptional<z.ZodString>;
    environment: z.ZodEnum<['development', 'production', 'test']>;
    debug: z.ZodBoolean;
    enableDebugLogging: z.ZodBoolean;
    cacheDuration: z.ZodNumber;
    features: z.ZodObject<
      {
        analytics: z.ZodBoolean;
        aiCoach: z.ZodBoolean;
        spaceRepetition: z.ZodBoolean;
        adaptiveLearning: z.ZodBoolean;
      },
      'strip',
      z.ZodTypeAny,
      {
        analytics: boolean;
        aiCoach: boolean;
        spaceRepetition: boolean;
        adaptiveLearning: boolean;
      },
      {
        analytics: boolean;
        aiCoach: boolean;
        spaceRepetition: boolean;
        adaptiveLearning: boolean;
      }
    >;
    security: z.ZodObject<
      {
        csrfEnabled: z.ZodBoolean;
        rateLimit: z.ZodObject<
          {
            enabled: z.ZodBoolean;
            maxRequests: z.ZodNumber;
            windowMs: z.ZodNumber;
          },
          'strip',
          z.ZodTypeAny,
          {
            enabled: boolean;
            maxRequests: number;
            windowMs: number;
          },
          {
            enabled: boolean;
            maxRequests: number;
            windowMs: number;
          }
        >;
      },
      'strip',
      z.ZodTypeAny,
      {
        csrfEnabled: boolean;
        rateLimit: {
          enabled: boolean;
          maxRequests: number;
          windowMs: number;
        };
      },
      {
        csrfEnabled: boolean;
        rateLimit: {
          enabled: boolean;
          maxRequests: number;
          windowMs: number;
        };
      }
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    security: {
      csrfEnabled: boolean;
      rateLimit: {
        enabled: boolean;
        maxRequests: number;
        windowMs: number;
      };
    };
    environment: 'development' | 'production' | 'test';
    version: string;
    debug: boolean;
    features: {
      analytics: boolean;
      aiCoach: boolean;
      spaceRepetition: boolean;
      adaptiveLearning: boolean;
    };
    apiUrl: string;
    enableDebugLogging: boolean;
    cacheDuration: number;
    wsUrl?: string | undefined;
  },
  {
    security: {
      csrfEnabled: boolean;
      rateLimit: {
        enabled: boolean;
        maxRequests: number;
        windowMs: number;
      };
    };
    environment: 'development' | 'production' | 'test';
    version: string;
    debug: boolean;
    features: {
      analytics: boolean;
      aiCoach: boolean;
      spaceRepetition: boolean;
      adaptiveLearning: boolean;
    };
    apiUrl: string;
    enableDebugLogging: boolean;
    cacheDuration: number;
    wsUrl?: string | undefined;
  }
>;
export type Features = z.infer<typeof FeaturesSchema>;
export type Security = z.infer<typeof SecuritySchema>;
export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;
export declare const getEnvironmentConfig: (env: EnvironmentType) => EnvironmentConfig;
export declare const validateEnvironment: (env: string) => EnvironmentType;
export declare const getCurrentEnvironment: () => EnvironmentType;
