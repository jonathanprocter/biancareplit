declare class EnhancedFlashcardSystem {
    flashcards: any[];
    currentCard: number;
    wrongAnswersDB: any[];
    reviewMode: boolean;
    initialize(): Promise<void>;
    loadFlashcards(): Promise<void>;
    getAIRecommendations(): Promise<void>;
    filterDueCards(): void;
    saveFlashcards(): void;
    addWrongAnswer(question: any, userAnswer: any, correctAnswer: any, explanation: any, category: any, difficulty: any): Promise<void>;
    createAIEnhancedFlashcard(wrongAnswer: any): Promise<void>;
    calculateNextReview(quality: any, card: any): {
        nextReview: string;
        easiness: any;
        interval: number;
        repetitions: any;
    };
    createFlashcardFromWrongAnswer(wrongAnswer: any): void;
    createCustomFlashcard(front: any, back: any, difficulty?: string): Promise<void>;
    rateCard(quality: any): void;
    startReview(): void;
    exitReview(): void;
    render(): void;
    flipCard(): void;
    nextCard(): void;
    prevCard(): void;
}
