declare class AnalyticsDashboardHandler {
    initialized: boolean;
    charts: {};
    initialize(): Promise<void>;
    loadData(): Promise<{
        performance: {
            labels: string[];
            datasets: {
                label: string;
                data: number[];
                borderColor: string;
                tension: number;
            }[];
        };
        category: {
            labels: string[];
            datasets: {
                label: string;
                data: number[];
                backgroundColor: string;
                borderColor: string;
                pointBackgroundColor: string;
            }[];
        };
        studyTime: {
            labels: string[];
            datasets: {
                data: number[];
                backgroundColor: string[];
            }[];
        };
        dailySummary: {
            questionsAttempted: number;
            accuracy: number;
            totalStudyTime: number;
            recommendations: never[];
        };
    }>;
    getDefaultPerformanceData(): {
        labels: string[];
        datasets: {
            label: string;
            data: number[];
            borderColor: string;
            tension: number;
        }[];
    };
    getDefaultCategoryData(): {
        labels: string[];
        datasets: {
            label: string;
            data: number[];
            backgroundColor: string;
            borderColor: string;
            pointBackgroundColor: string;
        }[];
    };
    getDefaultStudyTimeData(): {
        labels: string[];
        datasets: {
            data: number[];
            backgroundColor: string[];
        }[];
    };
    getDefaultSummaryData(): {
        questionsAttempted: number;
        accuracy: number;
        totalStudyTime: number;
        recommendations: never[];
    };
    initializeCharts(data: any): Promise<void>;
    updateCharts(data: any): void;
    updateDailySummary(summary: any): void;
    formatStudyTime(minutes: any): string;
    showError(message: any): void;
    addStyles(): void;
    addStyles(): void;
    sendDailySummaryEmail(): Promise<void>;
    sendDailySummaryEmail(): Promise<void>;
}
