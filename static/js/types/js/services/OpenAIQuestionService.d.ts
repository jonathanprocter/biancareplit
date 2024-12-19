export const openAIService: OpenAIQuestionService;
declare class OpenAIQuestionService {
    initialized: boolean;
    questionCache: Map<any, any>;
    initializationPromise: any;
    categories: {
        pharmacology: {
            topics: string[];
            difficulties: string[];
        };
        'medical-surgical': {
            topics: string[];
            difficulties: string[];
        };
        pediatrics: {
            topics: string[];
            difficulties: string[];
        };
        maternal: {
            topics: string[];
            difficulties: string[];
        };
        psychiatric: {
            topics: string[];
            difficulties: string[];
        };
        fundamentals: {
            topics: string[];
            difficulties: string[];
        };
    };
    initialize(): Promise<boolean>;
    preWarmCache(): Promise<void>;
    generateQuestionsForCategory(category: any, count?: number): Promise<any>;
    startCacheMaintenance(): void;
    maintainCache(): Promise<void>;
    getQuestions(category: any, count?: number): Promise<{
        questions: any;
        success: boolean;
        bufferSize: any;
        error?: undefined;
    } | {
        questions: never[];
        success: boolean;
        error: any;
        bufferSize?: undefined;
    }>;
}
export {};
