import { EventEmitter } from './EventEmitter';

export interface StudySession {
  id: string;
  startTime: number;
  category?: string;
}

export interface AnalyticsData {
  totalStudyTime: number;
  completedCards: number;
  accuracy: number;
  categoryProgress: Record<string, number>;
}

interface FlashcardSystemEvents {
  initialized: { timestamp: number; analyticsReady: boolean };
  sessionStarted: { timestamp: number };
  sessionEnded: { timestamp: number; stats: any };
  cleanup: { timestamp: number };
  resultSaved: { success: boolean; data: any };
  error: { message: string; timestamp: number };
}

export class FlashcardSystem extends EventEmitter<FlashcardSystemEvents> {
  private initialized = false;
  private analyticsReady = false;
  private currentSession: StudySession | null = null;
  private analytics: AnalyticsData = {
    totalStudyTime: 0,
    completedCards: 0,
    accuracy: 0,
    categoryProgress: {},
  };

  constructor() {
    super();
    this.addCleanupListener();
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  async initialize(): Promise<{ success: boolean; error?: string }> {
    if (this.initialized) {
      return { success: true };
    }

    try {
      this.initialized = true;
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown initialization error';
      return { success: false, error: message };
    }
  }

  startNewSession(category?: string): StudySession {
    const session = {
      id: crypto.randomUUID(),
      startTime: Date.now(),
      category,
    };
    this.currentSession = session;
    return session;
  }

  getCurrentSession(): StudySession | null {
    return this.currentSession;
  }

  getAnalyticsData(): AnalyticsData {
    return { ...this.analytics };
  }

  async saveResult(data: any): Promise<AnalyticsData | null> {
    try {
      // Update analytics with new data
      this.analytics = {
        ...this.analytics,
        totalStudyTime: (this.analytics.totalStudyTime || 0) + (data.duration || 0),
        completedCards: (this.analytics.completedCards || 0) + 1,
        accuracy: data.accuracy || this.analytics.accuracy,
        categoryProgress: {
          ...this.analytics.categoryProgress,
          [data.category]: (this.analytics.categoryProgress[data.category] || 0) + 1,
        },
      };
      return this.analytics;
    } catch (error) {
      console.error('Failed to save result:', error);
      return null;
    }
  }

  cleanup(): void {
    this.initialized = false;
    this.currentSession = null;
  }

  private addCleanupListener() {
    if (typeof window !== 'undefined') {
      const cleanup = () => {
        this.emit('cleanup', { timestamp: Date.now() });
      };
      window.addEventListener('beforeunload', cleanup);
    }
  }
}

export const flashcardSystem = new FlashcardSystem();
export default flashcardSystem;
