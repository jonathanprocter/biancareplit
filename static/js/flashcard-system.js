import { configManager } from './config/system.config.js';
import { initializeMiddlewareSystem } from './middleware/system.middleware.js';
import EventEmitter from './utils/EventEmitter';

// Singleton middleware system instance
let middlewareSystem = null;

// Get or initialize middleware system
const getMiddlewareSystem = async () => {
  if (!middlewareSystem) {
    try {
      middlewareSystem = await initializeMiddlewareSystem(configManager.get());
      console.log(
        '[FlashcardSystem] Middleware system initialized successfully',
      );
    } catch (error) {
      console.error(
        '[FlashcardSystem] Failed to initialize middleware system:',
        error,
      );
      throw error;
    }
  }
  return middlewareSystem;
};

class EnhancedFlashcardSystem extends EventEmitter {
  constructor() {
    super();
    if (!EnhancedFlashcardSystem.instance) {
      // Initialize state
      this.initialized = false;
      this.analyticsReady = false;
      this.studyMaterialHandler = null;
      this.studySlots = [];
      this.currentSlot = null;
      this.analyticsData = {
        totalStudyTime: 0,
        completedCards: 0,
        accuracy: 0,
        categoryProgress: {},
        lastUpdate: null,
      };

      // Initialize configuration
      this.config = configManager;

      // Set instance
      EnhancedFlashcardSystem.instance = this;
    }
    return EnhancedFlashcardSystem.instance;
  }

  async initialize() {
    if (this.initialized) {
      console.log('[FlashcardSystem] System already initialized');
      return { success: true, status: 'already_initialized' };
    }

    try {
      const context = {
        operation: 'system_initialization',
        system: this,
        timestamp: new Date().toISOString(),
      };

      const middleware = await getMiddlewareSystem();
      await middleware.execute(context);

      if (!this.analyticsReady) {
        await this.initializeAnalytics();
      }

      const initialSlot = this.createNewSession('initial');
      this.studySlots.push(initialSlot);

      this.initialized = true;

      this.emit('initialized', {
        timestamp: Date.now(),
        analyticsReady: this.analyticsReady,
        config: this.config.get('analytics'),
      });

      return { success: true, status: 'initialized' };
    } catch (error) {
      console.error('[FlashcardSystem] Initialization failed:', error);
      throw error;
    }
  }

  async initializeAnalytics() {
    if (!this.analyticsReady) {
      try {
        const middleware = await getMiddlewareSystem();
        await middleware.execute({
          operation: 'analytics_initialization',
          system: this,
          timestamp: new Date().toISOString(),
        });

        const analyticsConfig = this.config.get('analytics');
        if (!analyticsConfig?.enabled) {
          console.log('[FlashcardSystem] Analytics disabled in configuration');
          return false;
        }

        this.analyticsReady = true;
        return true;
      } catch (error) {
        console.error(
          '[FlashcardSystem] Analytics initialization failed:',
          error,
        );
        this.analyticsReady = false;
        throw error;
      }
    }
    return this.analyticsReady;
  }

  createNewSession(type = 'study') {
    return {
      id: Date.now(),
      type,
      startTime: Date.now(),
      endTime: null,
      completed: false,
      results: [],
    };
  }

  async saveResult(result) {
    if (!this.initialized) {
      throw new Error('[FlashcardSystem] System not initialized');
    }

    const context = {
      operation: 'save_result',
      system: this,
      data: result,
      timestamp: new Date().toISOString(),
    };

    try {
      const middleware = await getMiddlewareSystem();
      await middleware.execute(context);

      if (!this.currentSlot) {
        throw new Error('No active study slot');
      }

      const savedResult = {
        ...result,
        timestamp: new Date().toISOString(),
      };

      this.currentSlot.results.push(savedResult);
      this.emit('resultSaved', savedResult);

      return { success: true, data: savedResult };
    } catch (error) {
      const errorDetails = {
        type: 'save_result_error',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      console.error('[FlashcardSystem] Failed to save result:', errorDetails);
      this.emit('error', errorDetails);
      throw error;
    }
  }

  endCurrentSession() {
    if (this.currentSlot) {
      this.currentSlot.endTime = Date.now();
      this.currentSlot.completed = true;
      this.emit('sessionEnded', this.currentSlot);
    }
  }
}

// Create singleton instance
const flashcardSystem = new EnhancedFlashcardSystem();

// Export instance as default and other utilities as named exports
const flashcardSystemExports = {
  ...flashcardSystem,
  getMiddlewareSystem,
};

export default flashcardSystemExports;

// Development mode exports
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.flashcardSystem = flashcardSystemExports;
}
