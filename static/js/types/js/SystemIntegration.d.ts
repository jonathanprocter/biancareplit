declare const systemIntegration: SystemIntegration;
export class SystemIntegration {
  static getInstance(): any;
  configManager: {
    config: {};
    subscribers: Set<any>;
    history: any[];
    initialized: boolean;
    eventEmitter: EventEmitter;
    initialize(): boolean;
    loadDefaultConfig(): any;
    validateConfiguration(
      config: any,
      schema?: {
        version: string;
        environment: string;
        analytics: {
          enabled: string;
          trackingInterval: string;
          storageKey: string;
          sampling: {
            enabled: string;
            rate: string;
          };
        };
        aiCoach: {
          enabled: string;
          modelConfig: {
            temperature: string;
            maxTokens: string;
          };
        };
        middleware: {
          logging: string;
          errorHandling: string;
          performanceTracking: string;
          caching: string;
        };
      }
    ): boolean;
    get(path: any): any;
    set(path: any, value: any): boolean;
    getConfig(): {};
    subscribe(callback: any): () => boolean;
    reset(): void;
    isInitialized(): boolean;
  };
  eventEmitter: EventEmitter;
  initialized: boolean;
  analyticsReady: boolean;
  middlewareSystem: any;
  services: Map<any, any>;
  defaultConfig: {
    telemetry: {
      enabled: boolean;
      sampleRate: number;
      logLevel: string;
      updateInterval: number;
      errorTracking: boolean;
      metricsEnabled: boolean;
      batchSize: number;
      flushInterval: number;
    };
    middleware: {
      logging: {
        enabled: boolean;
        level: string;
        format: string;
        fallbackToConsole: boolean;
      };
      performance: {
        enabled: boolean;
        warningThreshold: number;
        criticalThreshold: number;
        samplingRate: number;
      };
      analytics: {
        enabled: boolean;
        realtime: boolean;
        updateInterval: number;
        batchSize: number;
      };
    };
  };
  wsUrl: any;
  wsConfig: {};
  wsState: {};
  ws: WebSocket | null;
  wsConnected: boolean;
  wsReconnectAttempts: number;
  wsReconnectTimer: any;
  wsReconnectDelay: number;
  wsReconnectBackoff: number;
  wsMaxReconnectAttempts: number;
  pingInterval: NodeJS.Timeout | null;
  validateConfiguration(config: any): {};
  getDefaultConfig(): {
    middleware: {
      logging: {
        enabled: boolean;
        level: string;
        format: string;
        fallbackToConsole: boolean;
      };
      performance: {
        enabled: boolean;
        warningThreshold: number;
        criticalThreshold: number;
        samplingRate: number;
      };
      analytics: {
        enabled: boolean;
        realtime: boolean;
        updateInterval: number;
        batchSize: number;
      };
    };
    telemetry: {
      enabled: boolean;
      sampleRate: number;
      logLevel: string;
      updateInterval: number;
      errorTracking: boolean;
      metricsEnabled: boolean;
    };
  };
  deepMerge(target: any, source: any): any;
  isObject(item: any): any;
  initialize(config?: {}): Promise<
    | {
        success: boolean;
        status: string;
      }
    | {
        success: boolean;
        status: string;
        config: {};
        middlewareStatus: {
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
          use(name: any, middleware: any, type?: string): /*elided*/ any;
          execute(context: any): Promise<any>;
          executeMiddlewareChain(type: any, context: any): Promise<any>;
        };
        initializationTime: string;
        analyticsReady: boolean;
      }
  >;
  initializeConfiguration(config: any): {};
  setupEventHandlers(): void;
  getConfig(): {};
  updateConfig(newConfig: any): {};
  initializeAnalytics(): Promise<boolean | undefined>;
  setupErrorHandlers(): void;
  initializeCoreServices(config: any): Promise<void>;
  _handleWebSocketMessage(data: any): void;
  _sendHeartbeat: () => void;
  _scheduleReconnection: () => void;
  initializeWebSocket: () => Promise<void>;
  connectionTimeout: NodeJS.Timeout | undefined;
}
import { EventEmitter } from './utils/EventEmitter.js';
export { systemIntegration as default };
