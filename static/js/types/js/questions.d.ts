declare function loadQuestions(category?: string): Promise<void>;
declare function displayCurrentQuestion(): void;
declare function handleSubmit(event: any): Promise<void>;
declare function showFeedback(result: any): void;
declare function nextQuestion(): void;
declare function previousQuestion(): void;
declare function showError(message: any): void;
declare function showStoredFeedback(questionId: any): void;
declare namespace state {
    let questions: never[];
    let currentQuestionIndex: number;
    let score: number;
    let totalAnswered: number;
    let answerHistory: {};
    let startTime: null;
    let sessionStartTime: number;
    let studyDuration: number;
}
