import { EventEmitter } from 'events';

class FlashcardSystem extends EventEmitter {
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
      await this.initializeAnalytics();

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
      throw error;
    }
  }

  async initializeAnalytics() {
    try {
      const analytics = {
        totalStudyTime: 0,
        completedCards: 0,
        accuracy: 0,
        categoryProgress: {},
        timestamp: new Date().toISOString(),
        sessions: [],
        results: [],
      };

      this.analyticsData = analytics;
      this.analyticsReady = true;
      return analytics;
    } catch (error) {
      console.error('Analytics initialization failed:', error);
      throw error;
    }
  }

  startNewSession(type = 'study') {
    const session = {
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

  async saveResult(result) {
    if (!this.initialized) {
      throw new Error('FlashcardSystem not initialized');
    }

    try {
      // Update analytics data
      const updatedAnalytics = {
        ...this.analyticsData,
        totalStudyTime: this.analyticsData.totalStudyTime + (result.duration || 0),
        completedCards: this.analyticsData.completedCards + 1,
        accuracy: result.accuracy || this.analyticsData.accuracy,
        categoryProgress: {
          ...this.analyticsData.categoryProgress,
          ...result.categoryProgress,
        },
        lastUpdate: Date.now(),
      };

      this.analyticsData = updatedAnalytics;
      this.emit('resultSaved', result);

      return updatedAnalytics;
    } catch (error) {
      console.error('Failed to save result:', error);
      throw error;
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