declare class AIQuestionGenerator {
    constructor(apiKey: any);
    apiKey: any;
    baseUrl: string;
    generateQuestion(difficulty: any, topic: any, subtopic: any): Promise<any>;
    bulkGenerateQuestions(topics: any, difficulties: any, count?: number): Promise<any[]>;
    initializeEventListeners(): void;
}
