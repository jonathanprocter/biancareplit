import { EventEmitter } from 'events';

/**
 * @class FlashcardSystem
 * @extends EventEmitter
 * @description Core system for managing flashcard functionality
 */
class FlashcardSystem extends EventEmitter {
  constructor() {
    super();
    this.cards = [];
    this.currentIndex = 0;
    this.analytics = null;
    this.initialized = false;
    this.initializationErrors = [];
  }

  async addCard(front, back, metadata = {}) {
    try {
      const card = {
        id: Date.now(),
        front,
        back,
        metadata,
        lastReviewed: null,
        created: new Date().toISOString(),
      };

      this.cards.push(card);
      this.emit('cardAdded', card);

      return { success: true, card };
    } catch (error) {
      console.error('[FlashcardSystem] Error adding card:', error);
      return { success: false, error: error.message };
    }
  }

  async initialize() {
    if (this.initialized) {
      console.log('[FlashcardSystem] System already initialized');
      return { success: true, status: 'already_initialized' };
    }

    try {
      console.log('[FlashcardSystem] Starting initialization...');
      await this.initializeAnalytics();
      this.initialized = true;
      this.emit('initialized');
      console.log('[FlashcardSystem] System initialized successfully');
      return { success: true, status: 'initialized' };
    } catch (error) {
      console.error('[FlashcardSystem] Error during initialization:', error);
      this.initializationErrors.push({
        timestamp: new Date().toISOString(),
        error: error.message,
      });
      return { success: false, error: error.message };
    }
  }

  async initializeAnalytics() {
    try {
      console.log('[FlashcardSystem] Initializing analytics...');
      // Analytics initialization logic here
      return true;
    } catch (error) {
      console.error(
        '[FlashcardSystem] Analytics initialization failed:',
        error
      );
      throw error;
    }
  }

  async handleResult(result) {
    if (!result) {
      console.error('[FlashcardSystem] Result data is required');
      return { success: false, error: 'Result data is required' };
    }

    try {
      const response = await fetch('/api/save-result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(result),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.emit('resultSaved', data);
      return { success: true, data };
    } catch (error) {
      console.error('[FlashcardSystem] Error handling result:', error);
      return { success: false, error: error.message };
    }
  }

  getSystemStatus() {
    return {
      initialized: this.initialized,
      cardsCount: this.cards.length,
      errors: this.initializationErrors,
      timestamp: new Date().toISOString(),
    };
  }

  // Singleton implementation
  static getInstance() {
    if (!window.flashcardSystemInstance) {
      window.flashcardSystemInstance = new FlashcardSystem();
    }
    return window.flashcardSystemInstance;
  }
}

// Initialize system when the DOM is loaded
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const system = FlashcardSystem.getInstance();
    system.initialize().catch(error => {
      console.error('[FlashcardSystem] Initialization failed:', error);
    });
  });
}

export default FlashcardSystem;
