export default configManager;
export const configManager: ConfigurationManager;
declare class ConfigurationManager {
    config: {};
    subscribers: Set<any>;
    history: any[];
    initialized: boolean;
    eventEmitter: EventEmitter;
    initialize(): boolean;
    loadDefaultConfig(): any;
    validateConfiguration(config: any, schema?: {
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
    }): boolean;
    get(path: any): any;
    set(path: any, value: any): boolean;
    getConfig(): {};
    subscribe(callback: any): () => boolean;
    reset(): void;
    isInitialized(): boolean;
}
import EventEmitter from '../utils/EventEmitter';
