import type { MiddlewareContext, NextFunction } from './index';
export declare abstract class BaseMiddleware {
  protected config: any;
  constructor();
  abstract execute(context: MiddlewareContext, next: NextFunction): Promise<void>;
  protected validateContext(context: MiddlewareContext): void;
  protected handleError(error: Error, context: MiddlewareContext): Promise<void>;
}
