export const questionService: QuestionService;
declare class QuestionService {
    questionBuffer: Map<any, any>;
    MIN_BUFFER_SIZE: number;
    MAX_RETRIES: number;
    bufferFillPromise: Promise<void> | null;
    failedAttempts: Map<any, any>;
    initialize(): Promise<void>;
    fillBuffers(): Promise<void>;
    fillCategoryBuffer(category: any): Promise<void>;
    startBufferMaintenance(): void;
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
