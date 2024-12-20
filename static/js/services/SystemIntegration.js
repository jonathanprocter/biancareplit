import { EventEmitter } from 'events';
import FlashcardSystem from 'study-system';

/**
 * @class SystemIntegration
 * @extends EventEmitter
 * @description Main system integration class that manages all subsystems
 */
class SystemIntegration extends EventEmitter {
  constructor() {
    super();
    this.flashcardSystem = FlashcardSystem.getInstance();
    this.initialized = false;
    this.initializationErrors = [];
  }

  async initialize() {
    if (this.initialized) {
      console.log('[SystemIntegration] System already initialized');
      return { success: true, status: 'already_initialized' };
    }

    try {
      console.log('[SystemIntegration] Starting initialization...');

      if (!this.flashcardSystem) {
        throw new Error('Flashcard system not found');
      }

      const result = await this.flashcardSystem.initialize();
      if (!result.success) {
        throw new Error(
          result.error || 'Failed to initialize flashcard system'
        );
      }

      // Set up event listeners
      this.flashcardSystem.on('cardAdded', card => {
        this.emit('cardAdded', card);
      });

      this.flashcardSystem.on('resultSaved', result => {
        this.emit('resultSaved', result);
      });

      this.initialized = true;
      this.emit('initialized');
      console.log('[SystemIntegration] System initialized successfully');

      return { success: true, status: 'initialized' };
    } catch (error) {
      console.error('[SystemIntegration] Initialization failed:', error);
      this.initializationErrors.push({
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack,
      });
      return { success: false, error: error.message };
    }
  }

  async saveStudyResult(data) {
    if (!this.initialized) {
      const initResult = await this.initialize();
      if (!initResult.success) {
        return initResult;
      }
    }
    return this.flashcardSystem.handleResult(data);
  }

  getSystemStatus() {
    return {
      initialized: this.initialized,
      flashcardSystemReady: this.flashcardSystem?.initialized || false,
      errors: this.initializationErrors,
      timestamp: new Date().toISOString(),
    };
  }
}

// Create and expose singleton instance
const systemIntegration = new SystemIntegration();

// Initialize when the DOM is loaded
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    systemIntegration.initialize().catch(error => {
      console.error('[SystemIntegration] Failed to initialize:', error);
    });
  });
}

export default systemIntegration;
