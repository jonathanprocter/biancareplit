// @ts-check
import { z } from 'zod';

/**
 * @typedef {Object} MiddlewareOptions
 * @property {string} [name] - Optional middleware name
 * @property {boolean} [enabled] - Whether middleware is enabled
 * @property {number} [priority] - Execution priority
 * @property {boolean} [trackPerformance] - Whether to track performance metrics
 */

// Context schema
const ExecutionContextSchema = z.object({
  operation: z.string(),
  timestamp: z.string().optional(),
  requestId: z.string().optional(),
  data: z.record(z.any()).optional(),
  config: z.record(z.any()).optional(),
  environment: z.enum(['development', 'production', 'test']).optional(),
});

export class BaseMiddleware {
  /** @type {string} */
  name;
  /** @type {boolean} */
  enabled;
  /** @type {number} */
  priority;
  /** @type {Object} */
  options;

  /**
   * @param {MiddlewareOptions} [options={}]
   */
  constructor(options = {}) {
    this.options = options;
    this.name = options.name || this.constructor.name;
    this.enabled = options.enabled !== undefined ? options.enabled : true;
    this.priority = options.priority || 0;
  }

  /**
   * @param {z.infer<typeof ExecutionContextSchema>} context
   * @param {() => Promise<any>} next
   * @returns {Promise<any>}
   */
  async execute(context, next) {
    if (!this.enabled) return next();

    try {
      const startTime = performance.now();
      const validatedContext = ExecutionContextSchema.parse(context);
      const result = await this._execute(validatedContext, next);
      const endTime = performance.now();

      if (this.options.trackPerformance) {
        console.log(`[${this.name}] Execution time: ${endTime - startTime}ms`);
      }

      return result;
    } catch (error) {
      console.error(`[${this.name}] Error:`, error);
      throw error;
    }
  }

  /**
   * @protected
   * @param {z.infer<typeof ExecutionContextSchema>} context
   * @param {() => Promise<any>} next
   * @returns {Promise<any>}
   */
  async _execute(context, next) {
    throw new Error('_execute method must be implemented by middleware class');
  }

  getName() {
    return this.name;
  }

  isEnabled() {
    return this.enabled;
  }

  getPriority() {
    return this.priority;
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  setPriority(priority) {
    this.priority = priority;
  }
}

export { ExecutionContextSchema };
export const createExecutionContext = data =>
  ExecutionContextSchema.parse(data);
