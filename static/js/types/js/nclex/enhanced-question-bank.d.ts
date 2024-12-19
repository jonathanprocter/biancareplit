export namespace NCLEX_CATEGORIES {
    let SAFE_EFFECTIVE_CARE: string;
    let HEALTH_PROMOTION: string;
    let PSYCHOSOCIAL: string;
    let PHYSIOLOGICAL: string;
}
export namespace DIFFICULTY_LEVELS {
    let BEGINNER: string;
    let INTERMEDIATE: string;
    let ADVANCED: string;
}
export class NCLEXQuestion {
    constructor(data: any);
    id: any;
    question: any;
    options: any;
    correctAnswer: any;
    explanation: any;
    category: any;
    subcategory: any;
    difficulty: any;
    topic: any;
    isAIGenerated: any;
    createdAt: any;
    rationale: any;
    commonMistakes: any;
    relatedConcepts: any;
    toFlashcard(): NCLEXFlashcard;
    createDetailedAnswer(): string;
    formatIncorrectAnswerExplanations(): string;
}
export class NCLEXFlashcard {
    constructor(data: any);
    id: `${string}-${string}-${string}-${string}-${string}`;
    front: any;
    back: any;
    metadata: any;
    createdAt: Date;
    lastReviewed: Date | null;
    reviewCount: number;
    confidence: number;
    nextReviewDate: Date;
    updateReviewSchedule(confidence: any): void;
    calculateNextReviewInterval(): number;
}
export class NCLEXQuestionBank {
    questions: Map<any, any>;
    flashcards: Map<any, any>;
    userProgress: Map<any, any>;
    initialized: boolean;
    initialize(): Promise<void>;
    openai: OpenAI | undefined;
    handleQuestionAnswer(questionId: any, userAnswer: any, confidenceLevel: any): Promise<{
        isCorrect: boolean;
        correctAnswer: any;
        explanation: any;
        flashcardCreated: boolean;
    }>;
    updateUserProgress(questionId: any, isCorrect: any, confidenceLevel: any): void;
    getDueFlashcards(): any[];
    getFlashcardAnalytics(): {
        totalFlashcards: number;
        byCategory: {};
        byDifficulty: {};
        averageConfidence: number;
    };
    calculateAverageConfidence(): number;
}
import OpenAI from 'openai';
