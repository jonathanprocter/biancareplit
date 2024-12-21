// FlashcardInterface.js - Core module for flashcard system
import React from 'react';

import { configManager } from '../config';
import { middlewareManager } from '../middleware';

class FlashcardSystem {
  constructor(rootElement) {
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

  async initialize() {
    if (this.initialized) {
      console.log('FlashcardSystem already initialized');
      return this;
    }

    try {
      console.log('Starting FlashcardSystem initialization...');

      // Initialize configuration first
      await this._initializeConfiguration();

      // Get configuration
      const config = configManager.getConfig();

      // Create middleware context
      const context = {
        timestamp: new Date().toISOString(),
        requestId: `init_${Date.now()}`,
        environment: config.environment,
        config,
      };

      // Execute middleware chain
      await middlewareManager.execute(context);

      console.log('Configuration loaded:', {
        version: config.version,
        environment: config.environment,
        features: Object.keys(config.features),
      });

      // Initialize required components sequentially
      await this._initializeComponents(config);

      this.initialized = true;
      console.log('FlashcardSystem initialization completed successfully');
      return this;
    } catch (error) {
      console.error('FlashcardSystem initialization failed:', error);
      this.initializationError = error;
      this.initialized = false;
      throw error;
    }
  }

  async _initializeConfiguration() {
    try {
      await configManager.initialize();
      this.initializationState.configLoaded = true;
    } catch (error) {
      console.error('Configuration initialization failed:', error);
      this.initializationError = error;
      throw error;
    }
  }

  async _initializeComponents(config) {
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
        console.log(
          `${component.name} initialization ${success ? 'successful' : 'failed'}`,
        );

        if (!success && component.required) {
          throw new Error(
            `Required component ${component.name} failed to initialize`,
          );
        }
      } catch (error) {
        console.error(`Error initializing ${component.name}:`, error);
        if (component.required) {
          throw error;
        }
      }
    }
  }

  async initializeAnalytics() {
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

  async initializeStudyMaterialHandler() {
    try {
      console.log('Initializing study material handler...');
      return true;
    } catch (error) {
      console.error('Study material handler initialization failed:', error);
      return false;
    }
  }

  getInitializationState() {
    return {
      ...this.initializationState,
      initialized: this.initialized,
      error: this.initializationError?.message,
    };
  }

  getInitializationError() {
    return this.initializationError;
  }
}

// Export singleton factory with proper error handling
export const FlashcardInterface = {
  instance: null,
  instancePromise: null,

  async create(rootElement) {
    try {
      if (!rootElement) {
        throw new Error('Root element is required for initialization');
      }

      if (!this.instance) {
        if (!this.instancePromise) {
          this.instancePromise = new Promise(async (resolve, reject) => {
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
      return this.instance;
    } catch (error) {
      console.error('Failed to create FlashcardInterface instance:', error);
      throw error;
    }
  },

  async initialize(rootElement) {
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
