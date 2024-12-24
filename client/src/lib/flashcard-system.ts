import { EventEmitter } from './EventEmitter';

interface StudySession {
  id: number;
  type: string;
  startTime: number;
  endTime: number | null;
  duration: number;
  completed: boolean;
  category: string;
  results: any[];
}

interface AnalyticsData {
  totalStudyTime: number;
  completedCards: number;
  accuracy: number;
  categoryProgress: Record<string, number>;
  lastUpdate: number | null;
}

interface FlashcardSystemConfig {
  analyticsEnabled: boolean;
  autoSave: boolean;
  reviewInterval: number;
}

type FlashcardSystemEvents = {
  initialized: { timestamp: number; analyticsReady: boolean };
  sessionStarted: StudySession;
  sessionEnded: StudySession;
  cleanup: { timestamp: number };
  resultSaved: any;
  error: { message: string; timestamp: number };
};

class FlashcardSystem extends EventEmitter {
  private initialized: boolean = false;
  private analyticsReady: boolean = false;
  private cards: any[] = [];
  private currentIndex: number = 0;
  private studySlots: StudySession[] = [];
  private config: FlashcardSystemConfig;
  private analyticsData: AnalyticsData = {
    totalStudyTime: 0,
    completedCards: 0,
    accuracy: 0,
    categoryProgress: {},
    lastUpdate: null,
  };
  private cleanupFunctions: Array<() => void> = [];

  constructor(config: Partial<FlashcardSystemConfig> = {}) {
    super();
    this.config = {
      analyticsEnabled: true,
      autoSave: true,
      reviewInterval: 30000,
      ...config,
    };
    this.addCleanupListener();
  }

  private addCleanupListener(): void {
    if (typeof window !== 'undefined') {
      const cleanup = (): void => {
        try {
          this.cleanup();
        } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
          const message = error instanceof Error ? error.message : 'Unknown error during cleanup';
          console.error('Error during cleanup:', message);
          this.emit('error', { message, timestamp: Date.now() });
        }
      };
      window.addEventListener('beforeunload', cleanup);
      this.cleanupFunctions.push(() => window.removeEventListener('beforeunload', cleanup));
    }
  }

  async initialize(): Promise<{ success: boolean; status?: string; error?: string }> {
    if (this.initialized) {
      return { success: true, status: 'already_initialized' };
    }

    try {
      console.log('Starting FlashcardSystem initialization...');
      const analytics = await this.initializeAnalytics();

      if (!analytics) {
        throw new Error('Failed to initialize analytics');
      }

      const initialSlot = this.startNewSession('initial');
      this.studySlots = [initialSlot];

      this.initialized = true;
      this.emit('initialized', {
        timestamp: Date.now(),
        analyticsReady: this.analyticsReady,
      });

      return { success: true, status: 'initialized' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown initialization error';
      console.error('FlashcardSystem initialization failed:', message);
      this.emit('error', { message, timestamp: Date.now() });
      return { success: false, error: message };
    }
  }

  private async initializeAnalytics(): Promise<AnalyticsData | null> {
    if (!this.config.analyticsEnabled) {
      return null;
    }

    try {
      const analytics: AnalyticsData = {
        totalStudyTime: 0,
        completedCards: 0,
        accuracy: 0,
        categoryProgress: {},
        lastUpdate: Date.now(),
      };

      this.analyticsData = analytics;
      this.analyticsReady = true;
      return analytics;
    } catch (error) {
      console.error('Analytics initialization failed:', error);
      return null;
    }
  }

  startNewSession(type = 'study'): StudySession {
    this.endCurrentSession();

    const session: StudySession = {
      id: Date.now(),
      type,
      startTime: Date.now(),
      endTime: null,
      duration: 0,
      completed: false,
      category: 'general',
      results: [],
    };

    this.emit('sessionStarted', session);
    return session;
  }

  async saveResult(result: any): Promise<AnalyticsData | null> {
    if (!this.initialized) {
      throw new Error('FlashcardSystem not initialized');
    }

    try {
      const updatedAnalytics: AnalyticsData = {
        ...this.analyticsData,
        totalStudyTime: Math.max(0, this.analyticsData.totalStudyTime + (result.duration || 0)),
        completedCards: Math.max(0, this.analyticsData.completedCards + 1),
        accuracy: Math.min(1, Math.max(0, result.accuracy || this.analyticsData.accuracy)),
        categoryProgress: {
          ...this.analyticsData.categoryProgress,
          ...(result.categoryProgress || {}),
        },
        lastUpdate: Date.now(),
      };

      this.analyticsData = updatedAnalytics;
      this.emit('resultSaved', result);

      return updatedAnalytics;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save result';
      console.error('Error saving result:', message);
      this.emit('error', { message, timestamp: Date.now() });
      return null;
    }
  }

  private endCurrentSession(): void {
    const currentSlot = this.getCurrentSession();
    if (currentSlot && !currentSlot.completed) {
      currentSlot.endTime = Date.now();
      currentSlot.duration = currentSlot.endTime - currentSlot.startTime;
      currentSlot.completed = true;
      this.emit('sessionEnded', currentSlot);
    }
  }

  cleanup(): void {
    try {
      this.endCurrentSession();
      this.cleanupFunctions.forEach((cleanup) => cleanup());
      this.cleanupFunctions = [];
      this.initialized = false;
      this.analyticsReady = false;
      this.emit('cleanup', { timestamp: Date.now() });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error during cleanup';
      console.error('Cleanup error:', message);
      this.emit('error', { message, timestamp: Date.now() });
    }
  }

  on<K extends keyof FlashcardSystemEvents>(
    event: K,
    callback: (data: FlashcardSystemEvents[K]) => void,
  ): () => void {
    return super.on(event, callback as Function);
  }

  emit<K extends keyof FlashcardSystemEvents>(event: K, data: FlashcardSystemEvents[K]): void {
    super.emit(event, data);
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getAnalyticsData(): AnalyticsData {
    return { ...this.analyticsData };
  }

  getCurrentSession(): StudySession | null {
    const currentSlot = this.studySlots[this.studySlots.length - 1];
    return currentSlot ? { ...currentSlot } : null;
  }
}

const flashcardSystem = new FlashcardSystem();

export default flashcardSystem;
export type { StudySession, AnalyticsData, FlashcardSystemEvents, FlashcardSystemConfig };
