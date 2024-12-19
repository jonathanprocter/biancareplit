export class AIStudyCoach {
    context: {};
    currentFlashcard: any;
    askQuestion(question: any): Promise<any>;
    saveFlashcard(difficulty: any, tags: any): Promise<any>;
}
