import { z } from 'zod';
import { configManager, type Config } from '../config/config';
import { BaseMiddleware } from './base.middleware';
import type { ExecutionContext, NextFunction } from './base.middleware';
import { Environment } from '../config/environment';

const ConfigContextSchema = z.object({
  operation: z.string(),
  timestamp: z.string(),
  config: z.record(z.any()).optional(),
  environment: z.enum(['development', 'production', 'test']).optional(),
});

export class ConfigMiddleware extends BaseMiddleware {
  private static instance: ConfigMiddleware;
  private config: Config | null = null;

  private constructor() {
    super({
      name: 'ConfigMiddleware',
      priority: 1000, // Highest priority to run first,
      enabled: true,
    });
  }

  public static getInstance(): ConfigMiddleware {
    if (!ConfigMiddleware.instance) {
      ConfigMiddleware.instance = new ConfigMiddleware();
    }
    return ConfigMiddleware.instance;
  }

  protected async onInitialize(): Promise<void> {
    try {
      if (!configManager.isInitialized()) {
        await configManager.initialize();
      }
      this.config = configManager.getConfig();
      console.log(
        '[ConfigMiddleware] Successfully initialized with config version:',
        this.config.version
      );
    } catch (error) {
      console.error('[ConfigMiddleware] Initialization failed:', error);
      throw error;
    }
  }

  protected async _execute(context: ExecutionContext, next: NextFunction): Promise<void> {
    try {
      // Validate context
      const validatedContext = ConfigContextSchema.parse(context);

      if (!this.config) {
        throw new Error('Configuration not loaded');
      }

      // Inject config into context
      context.config = this.config;

      // Add environment information
      context.environment = this.config.environment;

      const result = await next();

      return result;
    } catch (error) {
      console.error('[ConfigMiddleware] Execution error:', error);
      throw error;
    }
  }

  protected async beforeExecute(context: ExecutionContext): Promise<void> {
    context.timestamp = new Date().toISOString();
  }

  protected async afterExecute(context: ExecutionContext): Promise<void> {
    // Log successful execution if needed
    console.debug('[ConfigMiddleware] Successfully processed request:', {
      operation: context.operation,
      timestamp: context.timestamp,
    });
  }
}

export const configMiddleware = ConfigMiddleware.getInstance();
