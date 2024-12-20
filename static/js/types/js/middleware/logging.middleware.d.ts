export class LoggingMiddleware extends BaseMiddleware {
  constructor(options?: {});
  name: any;
  priority: any;
  logLevel: any;
  logFormat: any;
  execute(context: any, next: any): Promise<any>;
  log(level: any, data: any): void;
  sanitizeContext(context: any): any;
}
import { BaseMiddleware } from './base.middleware';
