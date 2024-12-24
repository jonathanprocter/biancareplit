
import { EventEmitter } from './EventEmitter';

interface FlashcardSystemConfig {
  analyticsEnabled: boolean;
  autoSave: boolean;
  reviewInterval: number;
}

interface FlashcardSystemEvents {
  initialized: { timestamp: number; analyticsReady: boolean };
  sessionStarted: any;
  sessionEnded: any;
  cleanup: { timestamp: number };
  resultSaved: { success: boolean; data: any };
  error: { message: string; timestamp: number };
}

class FlashcardSystem extends EventEmitter<FlashcardSystemEvents> {
  private initialized = false;
  private analyticsReady = false;
  private cards: any[] = [];
  private currentIndex = 0;
  private studySlots: any[] = [];
  private config: FlashcardSystemConfig;
  private analyticsData: any;
  private cleanupFunctions: Array<() => void> = [];

  constructor(config: Partial<FlashcardSystemConfig> = {}) {
    super();
    this.config = {
      analyticsEnabled: true,
      autoSave: true,
      reviewInterval: 30000,
      ...config,
    };
    this.analyticsData = {
      totalStudyTime: 0,
      completedCards: 0,
      accuracy: 0,
      categoryProgress: {},
    };
    this.addCleanupListener();
  }

  async initialize(): Promise<{ success: boolean; error?: string; status?: string }> {
    if (this.initialized) {
      return { success: true, status: 'already_initialized' };
    }

    try {
      const analytics = await this.initializeAnalytics();
      if (!analytics && this.config.analyticsEnabled) {
        throw new Error('Failed to initialize analytics');
      }
      
      this.initialized = true;
      this.emit('initialized', {
        timestamp: Date.now(),
        analyticsReady: this.analyticsReady,
      });

      return { success: true, status: 'initialized' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown initialization error';
      this.emit('error', { message, timestamp: Date.now() });
      return { success: false, error: message };
    }
  }

  private addCleanupListener(): void {
    if (typeof window !== 'undefined') {
      const cleanup = () => {
        try {
          this.cleanup();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error during cleanup';
          console.error('Error during cleanup:', message);
          this.emit('error', { message, timestamp: Date.now() });
        }
      };

      window.addEventListener('beforeunload', cleanup);
      this.cleanupFunctions.push(() => window.removeEventListener('beforeunload', cleanup));
    }
  }
}

export const flashcardSystem = new FlashcardSystem();
export default flashcardSystem;
