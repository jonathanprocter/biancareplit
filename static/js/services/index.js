// Enhanced services initialization with proper error handling
import { openAIService } from './OpenAIQuestionService';
import { aiCoachService } from './AICoachService';
import { NursingContentHandler } from '../nursing_content';
import { StudyTimer } from '../study_timer';

// Service exports
export { openAIService, aiCoachService };

class ServicesContainer {
  constructor() {
    this.services = new Map();
    this.initialized = false;
    this.initializationPromise = null;
  }

  async initialize() {
    if (this.initialized) return true;
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = this._initializeServices();
    return this.initializationPromise;
  }

  async _initializeServices() {
    try {
      // Initialize core services
      await this._initializeCoreServices();

      // Initialize supporting services
      await this._initializeSupportingServices();

      // Set up global access
      this._setupGlobalAccess();

      this.initialized = true;
      console.log('All services initialized successfully');
      return true;
    } catch (error) {
      this._handleError(error);
      throw error;
    }
  }

  async _initializeCoreServices() {
    // OpenAI Service
    await openAIService.initialize();
    this.services.set('questionService', openAIService);

    // AI Coach Service
    await aiCoachService.initialize();
    this.services.set('aiCoach', aiCoachService);
  }

  async _initializeSupportingServices() {
    // Study Timer
    const studyTimer = new StudyTimer();
    this.services.set('studyTimer', studyTimer);

    // Nursing Content Handler
    const nursingContent = new NursingContentHandler(
      this.getService('questionService'),
      this.getService('studyTimer'),
      this.getService('aiCoach')
    );
    await nursingContent.initialize();
    this.services.set('nursingContentHandler', nursingContent);
  }

  _setupGlobalAccess() {
    window.services = {
      questionService: this.getService('questionService'),
      studyTimer: this.getService('studyTimer'),
      nursingContentHandler: this.getService('nursingContentHandler'),
      aiCoach: this.getService('aiCoach'),
    };
  }

  _handleError(error) {
    console.error('Service initialization failed:', error);
    this._showErrorUI(error);
  }

  _showErrorUI(error) {
    const errorContainer = document.createElement('div');
    errorContainer.className =
      'fixed top-4 right-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-lg z-50';
    errorContainer.innerHTML = `
            <div class="flex items-center">
                <div class="ml-3">
                    <h3 class="font-bold">Initialization Error</h3>
                    <p class="text-sm">${error.message}</p>
                    <button 
                        class="mt-2 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                        onclick="window.location.reload()"
                    >
                        Retry
                    </button>
                </div>
            </div>
        `;
    document.body.appendChild(errorContainer);
  }

  getService(serviceName) {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found or not initialized`);
    }
    return service;
  }
}

// Export singleton instance
export const servicesContainer = new ServicesContainer();

// Initialize on page load
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    servicesContainer.initialize().catch(error => {
      console.error('Failed to initialize services:', error);
    });
  });
}
