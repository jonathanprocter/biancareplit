export function initializeMiddlewareSystem(config?: {}): Promise<MiddlewareSystem>;
declare class MiddlewareSystem {
  middlewares: Map<any, any>;
  eventEmitter: any;
  config: any;
  defaultConfig: {
    maxRetries: number;
    retryDelay: number;
    timeout: number;
    logging: {
      enabled: boolean;
      level: string;
    };
    errorHandling: {
      enabled: boolean;
      retryOnError: boolean;
    };
    performance: {
      tracking: boolean;
      warningThreshold: number;
      criticalThreshold: number;
    };
  };
  use(name: any, middleware: any, type?: string): this;
  execute(context: any): Promise<any>;
  executeMiddlewareChain(type: any, context: any): Promise<any>;
}
export {};
