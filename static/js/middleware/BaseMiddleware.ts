import { z } from 'zod';
import type { MiddlewareContext, NextFunction } from './index';

export abstract class BaseMiddleware {
    protected config: any;
    
    constructor() {
        this.config = null;
    }

    abstract execute(context: MiddlewareContext, next: NextFunction): Promise<void>;

    protected validateContext(context: MiddlewareContext): void {
        const ContextSchema = z.object({
            timestamp: z.string(),
            requestId: z.string(),
            environment: z.string(),
            config: z.any().optional(),
        });

        const result = ContextSchema.safeParse(context);
        if (!result.success) {
            throw new Error(`Invalid middleware context: ${result.error.message}`);
        }
    }

    protected async handleError(error: Error, context: MiddlewareContext): Promise<void> {
        console.error('Middleware error:', {
            middleware: this.constructor.name,
            error: error.message,
            context: {
                requestId: context.requestId,
                timestamp: context.timestamp,
            },
        });
        throw error;
    }
}
