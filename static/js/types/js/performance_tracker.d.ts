declare class PerformanceTracker {
  todayStats: any;
  initialize(): Promise<void>;
  loadDailySummary(): Promise<void>;
  setupEventListeners(): void;
  trackPerformance(questionId: any, isCorrect: any, timeTaken: any, category: any): Promise<void>;
  updateUI(): void;
}
