import { BaseMiddleware, type ExecutionContext } from './base.middleware';
export declare class MiddlewareManager {
  private static instance;
  private middlewares;
  private initialized;
  private constructor();
  static getInstance(): MiddlewareManager;
  initialize(): Promise<void>;
  addMiddleware(middleware: BaseMiddleware): void;
  execute(context: ExecutionContext): Promise<any>;
  removeMiddleware(name: string): void;
  getMiddlewares(): BaseMiddleware[];
}
export declare const middlewareManager: MiddlewareManager;
