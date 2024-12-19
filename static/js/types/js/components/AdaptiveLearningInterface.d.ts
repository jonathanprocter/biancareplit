import { NCLEXQuestion } from '../types/study';
interface AdaptiveLearningState {
    currentQuestion: NCLEXQuestion | null;
    questionHistory: QuestionAttempt[];
    loading: boolean;
    error: string | null;
    sessionStartTime: number;
}
interface QuestionAttempt {
    questionId: string;
    timestamp: string;
    correct: boolean;
    timeSpent: number;
    confidence: number;
}
export declare class AdaptiveLearningSystem {
    private readonly config;
    private state;
    constructor();
    initialize(): Promise<void>;
    submitAnswer(answer: string): Promise<void>;
    private saveAttempt;
    private loadNextQuestion;
    getState(): AdaptiveLearningState;
}
declare const _default: AdaptiveLearningSystem;
export default _default;
