// Custom EventEmitter implementation for browser
class EventEmitter {
  private events: { [key: string]: Function[] } = {};

  on(event: string, callback: Function) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  emit(event: string, data?: any) {
    if (this.events[event]) {
      this.events[event].forEach((callback) => callback(data));
    }
  }
}

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
  initialized: boolean;
  analyticsReady: boolean;
  cards: any[];
  currentIndex: number;
  studySlots: StudySession[];
  analyticsData: AnalyticsData;

  constructor() {
    super();
    this.initialized = false;
    this.analyticsReady = false;
    this.cards = [];
    this.currentIndex = 0;
    this.studySlots = [];
    this.analyticsData = {
      totalStudyTime: 0,
      completedCards: 0,
      accuracy: 0,
      categoryProgress: {},
      lastUpdate: null,
    };
  }

  async initialize() {
    if (this.initialized) {
      console.log('FlashcardSystem already initialized');
      return { success: true, status: 'already_initialized' };
    }

    try {
      console.log('Starting FlashcardSystem initialization...');

      // Initialize analytics
      const analytics = await this.initializeAnalytics();
      if (!analytics) {
        throw new Error('Failed to initialize analytics');
      }

      // Create initial study session
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
      // Update analytics data
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
    if (currentSlot) {
      currentSlot.endTime = Date.now();
      currentSlot.duration = currentSlot.endTime - currentSlot.startTime;
      currentSlot.completed = true;
      this.emit('sessionEnded', currentSlot);
    }
  }
}

// Create singleton instance
const flashcardSystem = new FlashcardSystem();

export default flashcardSystem;
