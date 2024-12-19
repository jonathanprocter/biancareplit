export function initializeAnalytics(): Promise<AnalyticsDashboard>;
declare class AnalyticsDashboard {
    metrics: {
        studyTime: number;
        questionsAttempted: number;
        correctAnswers: number;
        flashcardsReviewed: number;
    };
    sessionStart: Date;
    trackStudyTime(): number;
    saveMetrics(): Promise<any>;
    updateMetrics(type: any, data: any): void;
}
export {};
