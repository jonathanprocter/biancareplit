import { z } from 'zod';
export declare const CONFIG_VERSION = "1.0.0";
declare const MiddlewareConfigSchema: z.ZodDefault<z.ZodObject<{
    enabled: z.ZodBoolean;
    logging: z.ZodObject<{
        level: z.ZodEnum<["debug", "info", "warn", "error"]>;
        format: z.ZodEnum<["json", "text"]>;
        fallbackToConsole: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        format: "text" | "json";
        level: "error" | "debug" | "info" | "warn";
        fallbackToConsole: boolean;
    }, {
        format: "text" | "json";
        level: "error" | "debug" | "info" | "warn";
        fallbackToConsole: boolean;
    }>;
    analytics: z.ZodObject<{
        enabled: z.ZodBoolean;
        sampleRate: z.ZodNumber;
        bufferSize: z.ZodNumber;
        flushInterval: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        sampleRate: number;
        bufferSize: number;
        flushInterval: number;
    }, {
        enabled: boolean;
        sampleRate: number;
        bufferSize: number;
        flushInterval: number;
    }>;
    performance: z.ZodObject<{
        enabled: z.ZodBoolean;
        warningThreshold: z.ZodNumber;
        criticalThreshold: z.ZodNumber;
        sampling: z.ZodObject<{
            enabled: z.ZodBoolean;
            rate: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            rate: number;
        }, {
            enabled: boolean;
            rate: number;
        }>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        warningThreshold: number;
        criticalThreshold: number;
        sampling: {
            enabled: boolean;
            rate: number;
        };
    }, {
        enabled: boolean;
        warningThreshold: number;
        criticalThreshold: number;
        sampling: {
            enabled: boolean;
            rate: number;
        };
    }>;
}, "strip", z.ZodTypeAny, {
    analytics: {
        enabled: boolean;
        sampleRate: number;
        bufferSize: number;
        flushInterval: number;
    };
    enabled: boolean;
    logging: {
        format: "text" | "json";
        level: "error" | "debug" | "info" | "warn";
        fallbackToConsole: boolean;
    };
    performance: {
        enabled: boolean;
        warningThreshold: number;
        criticalThreshold: number;
        sampling: {
            enabled: boolean;
            rate: number;
        };
    };
}, {
    analytics: {
        enabled: boolean;
        sampleRate: number;
        bufferSize: number;
        flushInterval: number;
    };
    enabled: boolean;
    logging: {
        format: "text" | "json";
        level: "error" | "debug" | "info" | "warn";
        fallbackToConsole: boolean;
    };
    performance: {
        enabled: boolean;
        warningThreshold: number;
        criticalThreshold: number;
        sampling: {
            enabled: boolean;
            rate: number;
        };
    };
}>>;
export type MiddlewareConfig = z.infer<typeof MiddlewareConfigSchema>;
export declare const ConfigSchema: z.ZodObject<{
    version: z.ZodString;
    environment: z.ZodEnum<["development", "production", "test"]>;
    api: z.ZodObject<{
        baseUrl: z.ZodString;
        timeout: z.ZodNumber;
        retries: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        baseUrl: string;
        timeout: number;
        retries: number;
    }, {
        baseUrl: string;
        timeout: number;
        retries: number;
    }>;
    features: z.ZodObject<{
        analytics: z.ZodBoolean;
        aiCoach: z.ZodBoolean;
        spaceRepetition: z.ZodBoolean;
        adaptiveLearning: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        analytics: boolean;
        aiCoach: boolean;
        spaceRepetition: boolean;
        adaptiveLearning: boolean;
    }, {
        analytics: boolean;
        aiCoach: boolean;
        spaceRepetition: boolean;
        adaptiveLearning: boolean;
    }>;
    security: z.ZodObject<{
        csrfEnabled: z.ZodBoolean;
        rateLimit: z.ZodObject<{
            enabled: z.ZodBoolean;
            maxRequests: z.ZodNumber;
            windowMs: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            maxRequests: number;
            windowMs: number;
        }, {
            enabled: boolean;
            maxRequests: number;
            windowMs: number;
        }>;
    }, "strip", z.ZodTypeAny, {
        csrfEnabled: boolean;
        rateLimit: {
            enabled: boolean;
            maxRequests: number;
            windowMs: number;
        };
    }, {
        csrfEnabled: boolean;
        rateLimit: {
            enabled: boolean;
            maxRequests: number;
            windowMs: number;
        };
    }>;
    middleware: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodBoolean;
        logging: z.ZodObject<{
            level: z.ZodEnum<["debug", "info", "warn", "error"]>;
            format: z.ZodEnum<["json", "text"]>;
            fallbackToConsole: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            format: "text" | "json";
            level: "error" | "debug" | "info" | "warn";
            fallbackToConsole: boolean;
        }, {
            format: "text" | "json";
            level: "error" | "debug" | "info" | "warn";
            fallbackToConsole: boolean;
        }>;
        analytics: z.ZodObject<{
            enabled: z.ZodBoolean;
            sampleRate: z.ZodNumber;
            bufferSize: z.ZodNumber;
            flushInterval: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            sampleRate: number;
            bufferSize: number;
            flushInterval: number;
        }, {
            enabled: boolean;
            sampleRate: number;
            bufferSize: number;
            flushInterval: number;
        }>;
        performance: z.ZodObject<{
            enabled: z.ZodBoolean;
            warningThreshold: z.ZodNumber;
            criticalThreshold: z.ZodNumber;
            sampling: z.ZodObject<{
                enabled: z.ZodBoolean;
                rate: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                enabled: boolean;
                rate: number;
            }, {
                enabled: boolean;
                rate: number;
            }>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            warningThreshold: number;
            criticalThreshold: number;
            sampling: {
                enabled: boolean;
                rate: number;
            };
        }, {
            enabled: boolean;
            warningThreshold: number;
            criticalThreshold: number;
            sampling: {
                enabled: boolean;
                rate: number;
            };
        }>;
    }, "strip", z.ZodTypeAny, {
        analytics: {
            enabled: boolean;
            sampleRate: number;
            bufferSize: number;
            flushInterval: number;
        };
        enabled: boolean;
        logging: {
            format: "text" | "json";
            level: "error" | "debug" | "info" | "warn";
            fallbackToConsole: boolean;
        };
        performance: {
            enabled: boolean;
            warningThreshold: number;
            criticalThreshold: number;
            sampling: {
                enabled: boolean;
                rate: number;
            };
        };
    }, {
        analytics: {
            enabled: boolean;
            sampleRate: number;
            bufferSize: number;
            flushInterval: number;
        };
        enabled: boolean;
        logging: {
            format: "text" | "json";
            level: "error" | "debug" | "info" | "warn";
            fallbackToConsole: boolean;
        };
        performance: {
            enabled: boolean;
            warningThreshold: number;
            criticalThreshold: number;
            sampling: {
                enabled: boolean;
                rate: number;
            };
        };
    }>>;
    initialized: z.ZodBoolean;
}, "strict", z.ZodTypeAny, {
    security: {
        csrfEnabled: boolean;
        rateLimit: {
            enabled: boolean;
            maxRequests: number;
            windowMs: number;
        };
    };
    environment: "development" | "production" | "test";
    version: string;
    middleware: {
        analytics: {
            enabled: boolean;
            sampleRate: number;
            bufferSize: number;
            flushInterval: number;
        };
        enabled: boolean;
        logging: {
            format: "text" | "json";
            level: "error" | "debug" | "info" | "warn";
            fallbackToConsole: boolean;
        };
        performance: {
            enabled: boolean;
            warningThreshold: number;
            criticalThreshold: number;
            sampling: {
                enabled: boolean;
                rate: number;
            };
        };
    };
    api: {
        baseUrl: string;
        timeout: number;
        retries: number;
    };
    features: {
        analytics: boolean;
        aiCoach: boolean;
        spaceRepetition: boolean;
        adaptiveLearning: boolean;
    };
    initialized: boolean;
}, {
    security: {
        csrfEnabled: boolean;
        rateLimit: {
            enabled: boolean;
            maxRequests: number;
            windowMs: number;
        };
    };
    environment: "development" | "production" | "test";
    version: string;
    api: {
        baseUrl: string;
        timeout: number;
        retries: number;
    };
    features: {
        analytics: boolean;
        aiCoach: boolean;
        spaceRepetition: boolean;
        adaptiveLearning: boolean;
    };
    initialized: boolean;
    middleware?: {
        analytics: {
            enabled: boolean;
            sampleRate: number;
            bufferSize: number;
            flushInterval: number;
        };
        enabled: boolean;
        logging: {
            format: "text" | "json";
            level: "error" | "debug" | "info" | "warn";
            fallbackToConsole: boolean;
        };
        performance: {
            enabled: boolean;
            warningThreshold: number;
            criticalThreshold: number;
            sampling: {
                enabled: boolean;
                rate: number;
            };
        };
    } | undefined;
}>;
export type Config = z.infer<typeof ConfigSchema>;
declare class ConfigManager {
    private static instance;
    private config;
    private initialized;
    private constructor();
    static getInstance(): ConfigManager;
    initialize(): Promise<void>;
    getConfig(): Config;
    isInitialized(): boolean;
}
export declare const configManager: ConfigManager;
export {};
