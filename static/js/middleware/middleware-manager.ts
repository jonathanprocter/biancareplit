import { BaseMiddleware, type ExecutionContext, type NextFunction } from './base.middleware';
import { configManager } from '../config/config';

export class MiddlewareManager {
  private static instance: MiddlewareManager;
  private middlewares: BaseMiddleware[] = [];
  private initialized: boolean = false;

  private constructor() {}

  public static getInstance(): MiddlewareManager {
    if (!MiddlewareManager.instance) {
      MiddlewareManager.instance = new MiddlewareManager();
    }
    return MiddlewareManager.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('Initializing middleware manager...');

      // Ensure configuration is initialized
      if (!configManager.isInitialized()) {
        await configManager.initialize();
      }

      // Initialize all registered middleware
      for (const middleware of this.middlewares) {
        await middleware.initialize();
      }

      this.initialized = true;
      console.log('Middleware manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize middleware manager:', error);
      throw error;
    }
  }

  public addMiddleware(middleware: BaseMiddleware): void {
    if (this.middlewares.some((m) => m.getName() === middleware.getName())) {
      throw new Error(`Middleware '${middleware.getName()}' already registered`);
    }

    this.middlewares.push(middleware);
    this.middlewares.sort((a, b) => b.getPriority() - a.getPriority());
  }

  public async execute(context: ExecutionContext): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }

    let index = 0;
    const middlewares = this.middlewares;

    const next: NextFunction = async () => {
      if (index >= middlewares.length) {
        return Promise.resolve();
      }

      const middleware = middlewares[index++];
      if (!middleware.isEnabled()) {
        return next();
      }

      return middleware.execute(context, next);
    };

    return next();
  }

  public removeMiddleware(name: string): void {
    this.middlewares = this.middlewares.filter((m) => m.getName() !== name);
  }

  public getMiddlewares(): BaseMiddleware[] {
    return [...this.middlewares];
  }
}

export const middlewareManager = MiddlewareManager.getInstance();
