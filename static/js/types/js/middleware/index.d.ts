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
  next: NextFunction
) => Promise<void> | void;
declare class MiddlewareManager {
  private middlewares;
  private initialized;
  constructor();
  private setupDefaultMiddleware;
  use(middleware: MiddlewareFunction): void;
  private log;
  execute(context: MiddlewareContext): Promise<void>;
  isInitialized(): boolean;
}
export declare const middlewareManager: MiddlewareManager;
export {};
