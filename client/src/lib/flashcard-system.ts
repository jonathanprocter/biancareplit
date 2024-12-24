
import { EventEmitter } from './EventEmitter';

interface FlashcardSystemConfig {
  analyticsEnabled: boolean;
  autoSave: boolean;
  reviewInterval: number;
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
  private cards: any[] = [];
  private config: FlashcardSystemConfig;

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

  async initialize(): Promise<{ success: boolean; error?: string; status?: string }> {
    if (this.initialized) {
      return { success: true, status: 'already_initialized' };
    }

    try {
      const analytics = await this.initializeAnalytics();
      this.analyticsReady = analytics;
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

  private async initializeAnalytics(): Promise<boolean> {
    if (!this.config.analyticsEnabled) return false;
    try {
      // Analytics initialization logic would go here
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Analytics initialization failed:', message);
      return false;
    }
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
