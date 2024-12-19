export class NCLEXQuestionBank {
    questions: Map<any, any>;
    flashcards: Map<any, any>;
    categories: Map<any, any>;
    initialized: boolean;
    adaptiveMetrics: {
        userPerformance: Map<any, any>;
        difficultyAdjustments: Map<any, any>;
        categoryProgress: Map<any, any>;
        lastUpdate: null;
    };
    formatFlashcardBack(question: any): string;
    createFlashcard(question: any): {
        id: string;
        front: any;
        back: string;
        metadata: {
            questionId: any;
            category: any;
            subcategory: any;
            difficulty: any;
            topic: any;
            relatedConcepts: any;
        };
        nextReviewDate: Date;
        lastReviewed: null;
        reviewCount: number;
    } | null;
    updateAdaptiveMetrics(userId: any, questionId: any, isCorrect: any, timeTaken: any): Promise<any>;
    adjustQuestionDifficulty(userId: any, category: any): Promise<string | undefined>;
}
export function QuestionBankProvider({ children }: {
    children: any;
}): import("react/jsx-runtime").JSX.Element;
export const QuestionBankContext: React.Context<null>;
export namespace initialQuestionBank {
    let questions: {
        id: any;
        question: any;
        options: any;
        correctAnswer: any;
        explanation: any;
        category: any;
        subcategory: any;
        difficulty: any;
        topic: any;
        rationale: {
            mainExplanation: any;
            correctAnswerJustification: string;
            incorrectAnswerExplanations: {};
            keyPoints: never[];
        };
        relatedConcepts: never[];
        metadata: {
            createdAt: string;
            lastUpdated: string;
            reviewCount: number;
        };
    }[];
    let categories: {
        "Safe and Effective Care Environment": {
            subcategories: string[];
            questionCount: number;
        };
        "Health Promotion and Maintenance": {
            subcategories: string[];
            questionCount: number;
        };
        "Psychosocial Integrity": {
            subcategories: string[];
            questionCount: number;
        };
        "Physiological Integrity": {
            subcategories: string[];
            questionCount: number;
        };
    };
}
import React from 'react';
