import { z } from 'zod';
import { configManager } from '../config';

import type { Config } from '../config';

export interface MiddlewareContext {
  timestamp: string;
  requestId: string;
  environment: string;
  config?: Config;
}

export type NextFunction = () => Promise<void> | void;
export type MiddlewareFunction = (
  context: MiddlewareContext,
  next: NextFunction,
) => Promise<void> | void;

const LogLevelSchema = z.enum(['debug', 'info', 'warn', 'error']);
type LogLevel = z.infer<typeof LogLevelSchema>;

class MiddlewareManager {
  private middlewares: MiddlewareFunction[] = [];
  private initialized: boolean = false;

  constructor() {
    this.setupDefaultMiddleware();
  }

  private setupDefaultMiddleware() {
    // Add logging middleware
    this.use(async (ctx, next) => {
      const startTime = Date.now();
      try {
        await next();
      } catch (error) {
        this.log('error', 'Request failed', { error, context: ctx });
        throw error;
      }
      const duration = Date.now() - startTime;
      this.log('info', 'Request completed', { duration, context: ctx });
    });

    // Add security headers middleware
    this.use(async (ctx, next) => {
      if (configManager.getConfig().security.csrfEnabled) {
        // CSRF protection logic here
      }
      await next();
    });
  }

  use(middleware: MiddlewareFunction) {
    this.middlewares.push(middleware);
  }

  private log(level: LogLevel, message: string, data?: Record<string, any>) {
    const timestamp = new Date().toISOString();
    console[level](`[${timestamp}] ${message}`, data);
  }

  async execute(context: MiddlewareContext) {
    let index = 0;

    const next = async (): Promise<void> => {
      if (index >= this.middlewares.length) return;

      const middleware = this.middlewares[index++];
      await middleware(context, next);
    };

    await next();
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const middlewareManager = new MiddlewareManager();
