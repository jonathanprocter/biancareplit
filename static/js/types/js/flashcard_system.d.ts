declare class EnhancedFlashcardSystem {
    flashcards: any[];
    currentIndex: number;
    initialized: boolean;
    displayContainer: HTMLElement | null;
    wrongAnswersDB: any[];
    reviewMode: boolean;
    initialize(): Promise<boolean>;
    createCustomFlashcard(front: any, back: any, difficulty?: string, category?: string, nclexCategory?: null, keywords?: any[]): Promise<boolean>;
    createFlashcardFromMissedQuestion(questionData: any): Promise<boolean>;
    saveToStorage(): Promise<boolean>;
    getFlashcards(): any[];
    getFlashcardsByCategory(category: any): any[];
    render(): void;
    flipCard(): void;
    nextCard(): void;
    previousCard(): void;
    showSaveConfirmation(front: any, back: any): Promise<any>;
}
