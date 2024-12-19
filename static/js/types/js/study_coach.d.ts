declare class AIStudyCoach {
    currentFlashcard: any;
    flashcardSystem: any;
    askQuestion(question: any): Promise<{
        content: string;
        isFlashcard: boolean;
        question: any;
        answer: any;
        suggestedDifficulty: string;
        suggestedTopics: string[];
    } | {
        content: string;
        isFlashcard: boolean;
        question?: undefined;
        answer?: undefined;
        suggestedDifficulty?: undefined;
        suggestedTopics?: undefined;
    }>;
    saveFlashcard(difficulty: any, tags: any): Promise<{
        success: boolean;
        id: any;
        collection: string;
        difficulty: any;
        tags: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        id?: undefined;
        collection?: undefined;
        difficulty?: undefined;
        tags?: undefined;
    }>;
}
declare class StudyCoachInterface {
    aiCoach: AIStudyCoach;
    initialize(): void;
    setupEventListeners(): void;
    addMessageToChat(role: any, message: any): void;
    sendMessage(): Promise<void>;
    saveFlashcard(): Promise<void>;
    skipFlashcard(): void;
}
