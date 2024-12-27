import { z } from 'zod';

import { configManager } from '../config/config';

// Core middleware options schema
const MiddlewareOptionsSchema = z.object({
  name: z.string().optional(),
  enabled: z.boolean().optional(),
  priority: z.number().optional(),
});

export type MiddlewareOptions = z.infer<typeof MiddlewareOptionsSchema>;

// Execution context schema
const ExecutionContextSchema = z.object({
  operation: z.string(),
  timestamp: z.string(),
  data: z.record(z.any()).optional(),
  config: z.record(z.any()).optional(),
  environment: z.enum(['development', 'production', 'test']).optional(),
});

export type ExecutionContext = z.infer<typeof ExecutionContextSchema>;
export type NextFunction = () => Promise<any>;

/** Base middleware class that all middleware must extend */
export abstract class BaseMiddleware {
  protected name: string;
  protected enabled: boolean;
  protected priority: number;
  private initialized = false;

  constructor(options: MiddlewareOptions = {}) {
    const validatedOptions = MiddlewareOptionsSchema.parse(options);
    this.name = options.name || this.constructor.name;
    this.enabled = options.enabled !== undefined ? options.enabled : true;
    this.priority = options.priority || 0;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const config = configManager.getConfig();
      await this.onInitialize(config);
      this.initialized = true;
      console.log(`Middleware ${this.name} initialized successfully`);
    } catch (error) {
      console.error(`Failed to initialize middleware ${this.name}:`, error);
      throw error;
    }
  }

  async execute(context: ExecutionContext, next: NextFunction): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.enabled) return next();

    try {
      await this.beforeExecute(context);
      const result = await this._execute(context, next);
      await this.afterExecute(context);
      return result;
    } catch (error) {
      console.error(`Middleware ${this.name} error:`, error);
      throw error;
    }
  }

  protected abstract _execute(context: ExecutionContext, next: NextFunction): Promise<any>;

  protected async onInitialize(_config: any): Promise<void> {}
  protected async beforeExecute(_context: ExecutionContext): Promise<void> {}
  protected async afterExecute(_context: ExecutionContext): Promise<void> {}

  getName(): string {
    return this.name;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getPriority(): number {
    return this.priority;
  }
}
