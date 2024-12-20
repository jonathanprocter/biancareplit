import { z } from 'zod';
declare const MiddlewareOptionsSchema: z.ZodObject<
  {
    name: z.ZodOptional<z.ZodString>;
    enabled: z.ZodOptional<z.ZodBoolean>;
    priority: z.ZodOptional<z.ZodNumber>;
  },
  'strip',
  z.ZodTypeAny,
  {
    name?: string | undefined;
    enabled?: boolean | undefined;
    priority?: number | undefined;
  },
  {
    name?: string | undefined;
    enabled?: boolean | undefined;
    priority?: number | undefined;
  }
>;
export type MiddlewareOptions = z.infer<typeof MiddlewareOptionsSchema>;
declare const ExecutionContextSchema: z.ZodObject<
  {
    operation: z.ZodString;
    timestamp: z.ZodString;
    data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    environment: z.ZodOptional<z.ZodEnum<['development', 'production', 'test']>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    timestamp: string;
    operation: string;
    environment?: 'development' | 'production' | 'test' | undefined;
    data?: Record<string, any> | undefined;
    config?: Record<string, any> | undefined;
  },
  {
    timestamp: string;
    operation: string;
    environment?: 'development' | 'production' | 'test' | undefined;
    data?: Record<string, any> | undefined;
    config?: Record<string, any> | undefined;
  }
>;
export type ExecutionContext = z.infer<typeof ExecutionContextSchema>;
export type NextFunction = () => Promise<any>;
/** Base middleware class that all middleware must extend */
export declare abstract class BaseMiddleware {
  protected name: string;
  protected enabled: boolean;
  protected priority: number;
  private initialized;
  constructor(options?: MiddlewareOptions);
  initialize(): Promise<void>;
  execute(context: ExecutionContext, next: NextFunction): Promise<any>;
  protected abstract _execute(context: ExecutionContext, next: NextFunction): Promise<any>;
  protected onInitialize(_config: any): Promise<void>;
  protected beforeExecute(_context: ExecutionContext): Promise<void>;
  protected afterExecute(_context: ExecutionContext): Promise<void>;
  getName(): string;
  isEnabled(): boolean;
  getPriority(): number;
}
export {};
