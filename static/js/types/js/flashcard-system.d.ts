export default flashcardSystemExports;
declare const flashcardSystemExports: {
    getMiddlewareSystem: () => Promise<any>;
    initialized: boolean | undefined;
    analyticsReady: boolean | undefined;
    studyMaterialHandler: any;
    studySlots: any[] | undefined;
    currentSlot: any;
    analyticsData: {
        totalStudyTime: number;
        completedCards: number;
        accuracy: number;
        categoryProgress: {};
        lastUpdate: null;
    } | undefined;
    config: {
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
    } | undefined;
    events: any;
    onceEvents: Map<any, any>;
    _maxListeners: number;
    _listenerCounts: Map<any, any>;
    _warnings: Set<any>;
    _debugMode: boolean;
};
import EventEmitter from './utils/EventEmitter';
