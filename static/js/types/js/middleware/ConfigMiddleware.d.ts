import { BaseMiddleware } from './base.middleware';
import type { ExecutionContext, NextFunction } from './base.middleware';
export declare class ConfigMiddleware extends BaseMiddleware {
    private static instance;
    private config;
    private constructor();
    static getInstance(): ConfigMiddleware;
    protected onInitialize(): Promise<void>;
    protected _execute(context: ExecutionContext, next: NextFunction): Promise<void>;
    protected beforeExecute(context: ExecutionContext): Promise<void>;
    protected afterExecute(context: ExecutionContext): Promise<void>;
}
export declare const configMiddleware: ConfigMiddleware;
