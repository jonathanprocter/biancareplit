export class QuestionService {
    initialized: boolean;
    questions: any[];
    categories: Set<any>;
    initialize(): Promise<boolean>;
    getQuestions(category?: null, difficulty?: null): Promise<any>;
    submitAnswer(questionId: any, answer: any): Promise<any>;
}
