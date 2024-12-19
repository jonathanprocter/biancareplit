declare class MathContentHandler {
    currentTheorem: any;
    currentProblem: any;
    category: any;
    difficulty: any;
    initializeEventListeners(): void;
    loadTheorems(): Promise<void>;
    theorems: any;
    loadPracticeProblems(): Promise<void>;
    problems: any;
    displayCurrentTheorem(): void;
    displayCurrentProblem(): void;
    showError(message: any): void;
    nextTheorem(): void;
    nextProblem(): void;
    showHint(): void;
    checkSolution(): Promise<void>;
}
