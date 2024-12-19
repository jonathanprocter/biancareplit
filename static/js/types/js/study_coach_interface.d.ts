export class StudyCoachInterface {
    aiCoach: AIStudyCoach;
    initialized: boolean;
    initializeChatInterface(): boolean;
    setupEventListeners(): void;
    addMessageToChat(role: any, message: any): void;
    createFlashcard(): void;
    createQuiz(): void;
    sendMessage(): Promise<void>;
    showSaveDialog(): void;
    saveFlashcard(): Promise<void>;
    skipFlashcard(): void;
    closeDialog(): void;
    initialize(): Promise<void>;
}
import { AIStudyCoach } from './ai_study_coach';
