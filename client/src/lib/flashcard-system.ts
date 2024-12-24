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

class FlashcardSystem extends EventEmitter {
  private initialized: boolean = false;
  private analyticsReady: boolean = false;
  private cards: any[] = [];
  private currentIndex: number = 0;
  private studySlots: StudySession[] = [];
  private analyticsData: AnalyticsData = {
    totalStudyTime: 0,
    completedCards: 0,
    accuracy: 0,
    categoryProgress: {},
    lastUpdate: null,
  };
  private cleanupFunctions: (() => void)[] = [];

  constructor() {
    super();
    this.addCleanupListener();
  }

  private addCleanupListener() {
    if (typeof window !== 'undefined') {
      const cleanup = () => this.cleanup();
      window.addEventListener('beforeunload', cleanup);
      this.cleanupFunctions.push(() => 
        window.removeEventListener('beforeunload', cleanup)
      );
    }
  }

  async initialize() {
    if (this.initialized) {
      console.log('FlashcardSystem already initialized');
      return { success: true, status: 'already_initialized' };
    }

    try {
      console.log('Starting FlashcardSystem initialization...');

      const analytics = await this.initializeAnalytics();
      if (!analytics) {
        throw new Error('Failed to initialize analytics');
      }

      const initialSlot = this.startNewSession('initial');
      this.studySlots.push(initialSlot);

      this.initialized = true;
      this.emit('initialized', {
        timestamp: Date.now(),
        analyticsReady: this.analyticsReady,
      });

      return { success: true, status: 'initialized' };
    } catch (error) {
      console.error('FlashcardSystem initialization failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Initialization failed',
      };
    }
  }

  async initializeAnalytics(): Promise<AnalyticsData | null> {
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
    this.endCurrentSession(); // End any existing session

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

    this.studySlots.push(session);
    return session;
  }

  async saveResult(result: any) {
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
      console.error('Failed to save result:', error);
      return null;
    }
  }

  endCurrentSession() {
    const currentSlot = this.studySlots[this.studySlots.length - 1];
    if (currentSlot && !currentSlot.completed) {
      currentSlot.endTime = Date.now();
      currentSlot.duration = currentSlot.endTime - currentSlot.startTime;
      currentSlot.completed = true;
      this.emit('sessionEnded', currentSlot);
    }
  }

  cleanup() {
    this.endCurrentSession();
    this.cleanupFunctions.forEach(cleanup => cleanup());
    this.cleanupFunctions = [];
    this.initialized = false;
    this.analyticsReady = false;
    this.emit('cleanup', { timestamp: Date.now() });
  }

  // Public getters for internal state
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

// Create singleton instance
const flashcardSystem = new FlashcardSystem();

export default flashcardSystem;