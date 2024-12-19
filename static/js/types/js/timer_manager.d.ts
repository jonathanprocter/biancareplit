declare class TimerManager {
    studyDuration: number;
    questionStartTime: Date | null;
    sessionStartTime: any;
    isRunning: boolean;
    timerInterval: NodeJS.Timeout | null;
    timerDisplay: HTMLElement | null;
    initialized: boolean;
    initialize(): void;
    resetTimer(): void;
    startTimer(): void;
    pauseTimer(): void;
    getTimingData(): {
        sessionStart: any;
        questionStart: Date | null;
        timeTaken: number;
        studyDuration: number;
    };
    updateDisplay(): void;
}
