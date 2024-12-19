class TimerManager {
    constructor() {
        this.studyDuration = 0;
        this.questionStartTime = null;
        this.sessionStartTime = null;
        this.isRunning = false;
        this.timerInterval = null;
        this.timerDisplay = document.getElementById('studyTimer');
        this.initialized = false;

        try {
            this.initialize();
            console.log('Timer manager initialized successfully');
        } catch (error) {
            console.error('Timer initialization error:', error);
        }
    }

    initialize() {
        if (!this.timerDisplay) {
            throw new Error('Study timer display element not found');
        }
        this.initialized = true;
        this.resetTimer();
    }

    resetTimer() {
        this.studyDuration = 0;
        this.updateDisplay();
    }

    startTimer() {
        if (!this.initialized) {
            console.warn('Timer not initialized');
            return;
        }

        if (!this.isRunning) {
            this.sessionStartTime = this.sessionStartTime || new Date();
            this.questionStartTime = new Date();
            this.isRunning = true;
            
            this.timerInterval = setInterval(() => {
                this.studyDuration++;
                this.updateDisplay();
            }, 1000);
            
            console.log('Study timer started');
        }
    }

    pauseTimer() {
        if (!this.initialized) {
            console.warn('Timer not initialized');
            return;
        }

        if (this.isRunning) {
            clearInterval(this.timerInterval);
            this.isRunning = false;
            console.log('Study timer paused');
        }
    }

    getTimingData() {
        const now = new Date();
        return {
            sessionStart: this.sessionStartTime,
            questionStart: this.questionStartTime,
            timeTaken: this.questionStartTime ? Math.floor((now - this.questionStartTime) / 1000) : 0,
            studyDuration: this.studyDuration
        };
    }

    updateDisplay() {
        if (this.timerDisplay) {
            const hours = Math.floor(this.studyDuration / 3600);
            const minutes = Math.floor((this.studyDuration % 3600) / 60);
            const seconds = this.studyDuration % 60;
            
            this.timerDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }
}

// Initialize timer manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing timer manager...');
    window.timerManager = new TimerManager();
});