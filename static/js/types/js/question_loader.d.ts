export const questionLoader: QuestionLoader;
declare class QuestionLoader {
    constructor(baseUrl: any, maxRetries?: number);
    baseUrl: any;
    maxRetries: number;
    questionCache: Map<any, any>;
    pendingRequests: Map<any, any>;
    MINIMUM_QUESTIONS_THRESHOLD: number;
    BATCH_SIZE: number;
    loadQuestionsForCategory(category: any, retryCount?: number): any;
    _makeRequest(category: any, retryCount: any): any;
    generateAdditionalQuestions(section: any): Promise<boolean>;
}
export {};
