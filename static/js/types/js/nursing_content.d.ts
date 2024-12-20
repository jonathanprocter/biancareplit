declare const Chart: any;
declare class StudyTimer {
  sessionStart: number | undefined;
  questionStart: number | undefined;
  activeTime: number | undefined;
  questionTime: number | undefined;
  isActive: boolean | undefined;
  lastUpdateTime: number | undefined;
  displayInterval: NodeJS.Timeout | null;
  displayElement: HTMLElement | null | undefined;
  initializeFallback(): void;
  handleVisibilityChange(): void;
  pause(): void;
  resume(): void;
  startDisplayUpdates(): NodeJS.Timeout;
  updateTimers(): void;
  updateDisplay(): void;
  startNewQuestion(): void;
  getTiming(): {
    time_taken: number;
    study_duration: number;
  };
  getDebugState(): {
    sessionStart: string;
    questionStart: string;
    activeTime: number | undefined;
    questionTime: number | undefined;
    isActive: boolean | undefined;
    currentTime: string;
  };
  destroy(): void;
}
declare class NursingContentHandler {
  category: string;
  questions: any[];
  currentQuestion: any;
  currentIndex: number;
  selectedDifficulty: any;
  incorrectAnswers: any[];
  initialized: boolean;
  timer: StudyTimer | null;
  initializeTimer(): void;
  cleanup(): void;
  initialize(): void;
  handleVisibilityChange: (() => void) | undefined;
  handleWindowBlur: (() => void) | undefined;
  handleWindowFocus: (() => void) | undefined;
  loadQuestions(category?: null): Promise<void>;
  displayCurrentQuestion(): void;
  submitAnswer(): Promise<void>;
  previousQuestion(): void;
  nextQuestion(): void;
  showNotification(message: any, type?: string): HTMLDivElement | undefined;
  showError(message: any): void;
  filterByDifficulty(difficulty: any): void;
  generateQuestions(category?: string, difficulty?: string): Promise<boolean>;
}
