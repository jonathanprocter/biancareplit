import { configManager } from '../config/config';
import type { Config } from '../config/config';
import { initializeMiddlewareSystem } from '../middleware/system.middleware';

interface InitializationState {
  configLoaded: boolean;
  analyticsInitialized: boolean;
  studyMaterialInitialized: boolean;
}

interface MiddlewareContext {
  timestamp: string;
  requestId: string;
  environment: string;
  config: Config;
}

class FlashcardSystem {
  private rootElement: HTMLElement;
  private initialized: boolean;
  private analyticsReady: boolean;
  private initializationError: Error | null;
  private initializationState: InitializationState;

  constructor(rootElement: HTMLElement) {
    if (!rootElement) {
      console.error('Root element is required for initialization');
      throw new Error('Root element is required for initialization');
    }
    this.rootElement = rootElement;
    this.initialized = false;
    this.analyticsReady = false;
    this.initializationError = null;
    this.initializationState = {
      configLoaded: false,
      analyticsInitialized: false,
      studyMaterialInitialized: false,
    };
  }

  async initialize(): Promise<FlashcardSystem> {
    if (this.initialized) {
      console.log('FlashcardSystem already initialized');
      return this;
    }

    try {
      console.log('Starting FlashcardSystem initialization...');

      // Initialize configuration first
      await this.initializeConfiguration();

      // Get configuration
      const config = configManager.getConfig();

      // Create middleware context
      const context: MiddlewareContext = {
        timestamp: new Date().toISOString(),
        requestId: `init_${Date.now()}`,
        environment: config.environment,
        config,
      };

      // Initialize and execute middleware system
      const middlewareSystem = await initializeMiddlewareSystem(config.middleware);
      await middlewareSystem.execute(context);

      console.log('Configuration loaded:', {
        version: config.version,
        environment: config.environment,
        features: Object.keys(config.features),
      });

      // Initialize required components sequentially
      await this.initializeComponents(config);

      this.initialized = true;
      console.log('FlashcardSystem initialization completed successfully');
      return this;
    } catch (error) {
      console.error('FlashcardSystem initialization failed:', error);
      this.initializationError = error as Error;
      this.initialized = false;
      throw error;
    }
  }

  private async initializeConfiguration(): Promise<void> {
    try {
      await configManager.initialize();
      this.initializationState.configLoaded = true;
    } catch (error) {
      console.error('Configuration initialization failed:', error);
      this.initializationError = error as Error;
      throw error;
    }
  }

  private async initializeComponents(config: Config): Promise<void> {
    const initSequence = [
      {
        name: 'analytics',
        condition: () => config.features.analytics,
        init: async () => {
          const success = await this.initializeAnalytics();
          this.initializationState.analyticsInitialized = success;
          return success;
        },
        required: false,
      },
      {
        name: 'studyMaterial',
        condition: () => true,
        init: async () => {
          const success = await this.initializeStudyMaterialHandler();
          this.initializationState.studyMaterialInitialized = success;
          return success;
        },
        required: true,
      },
    ];

    for (const component of initSequence) {
      if (!component.condition()) continue;

      try {
        console.log(`Initializing ${component.name}...`);
        const success = await component.init();
        console.log(`${component.name} initialization ${success ? 'successful' : 'failed'}`);

        if (!success && component.required) {
          throw new Error(`Required component ${component.name} failed to initialize`);
        }
      } catch (error) {
        console.error(`Error initializing ${component.name}:`, error);
        if (component.required) {
          throw error;
        }
      }
    }
  }

  private async initializeAnalytics(): Promise<boolean> {
    try {
      const config = configManager.getConfig();
      const analytics = {
        version: config.version,
        environment: config.environment,
        timestamp: new Date().toISOString(),
        sessions: [],
        results: [],
      };

      localStorage.setItem('flashcardAnalytics', JSON.stringify(analytics));
      this.analyticsReady = true;
      console.log('Analytics initialized successfully');
      return true;
    } catch (error) {
      console.warn('Analytics initialization failed:', error);
      this.analyticsReady = false;
      return false;
    }
  }

  private async initializeStudyMaterialHandler(): Promise<boolean> {
    try {
      console.log('Initializing study material handler...');
      // Study material initialization logic here
      return true;
    } catch (error) {
      console.error('Study material handler initialization failed:', error);
      return false;
    }
  }

  public getInitializationState(): InitializationState & { initialized: boolean; error?: string } {
    return {
      ...this.initializationState,
      initialized: this.initialized,
      error: this.initializationError?.message,
    };
  }

  public getInitializationError(): Error | null {
    return this.initializationError;
  }
}

export const FlashcardInterface = {
  instance: null as FlashcardSystem | null,
  instancePromise: null as Promise<FlashcardSystem> | null,

  async create(rootElement: HTMLElement): Promise<FlashcardSystem> {
    try {
      if (!rootElement) {
        throw new Error('Root element is required for initialization');
      }

      if (!this.instance) {
        if (!this.instancePromise) {
          this.instancePromise = new Promise<FlashcardSystem>(async (resolve, reject) => {
            try {
              console.log('Creating new FlashcardSystem instance...');
              this.instance = new FlashcardSystem(rootElement);
              resolve(this.instance);
            } catch (error) {
              reject(error);
            }
          });
        }
        await this.instancePromise;
      }
      return this.instance as FlashcardSystem;
    } catch (error) {
      console.error('Failed to create FlashcardInterface instance:', error);
      throw error;
    }
  },

  async initialize(rootElement: HTMLElement): Promise<FlashcardSystem> {
    try {
      console.log('Initializing FlashcardInterface...');
      const system = await this.create(rootElement);
      await system.initialize();

      const initState = system.getInitializationState();
      console.log('FlashcardInterface initialization completed:', initState);

      if (!initState.initialized) {
        throw new Error('Initialization incomplete: ' + initState.error);
      }

      return system;
    } catch (error) {
      console.error('Failed to initialize FlashcardInterface:', error);
      throw error;
    }
  },
};

export default FlashcardInterface;
