// services/AICoachService.js
class AICoachService {
  constructor() {
    this.baseUrl = '/api/ai-coach';
    this.endpoints = {
      flashcard: `${this.baseUrl}/flashcard`,
      studyTip: `${this.baseUrl}/study-tip`,
    };

    // Log configuration
    console.log('AI Coach Service initialized with endpoints:', this.endpoints);
    this.retryAttempts = 3;
    this.retryDelay = 1000;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) {
      return true;
    }

    try {
      console.log('Initializing AI Coach Service...');
      await this.healthCheck();
      this.initialized = true;
      console.log('AI Coach Service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize AI Coach Service:', error);
      this.handleError(error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      console.log('Checking AI coach endpoint:', this.endpoints.flashcard);
      const response = await fetch(this.endpoints.flashcard, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic: 'test' }),
      });

      const data = await response.json();
      console.log('Health check response:', data);

      if (!response.ok) {
        throw new Error(`API health check failed: ${response.status} - ${JSON.stringify(data)}`);
      }
      return true;
    } catch (error) {
      console.error('Health check failed:', error);
      this.handleError(error);
      throw error;
    }
  }

  async createFlashcard(topic) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      console.log(`Creating flashcard for topic: ${topic}`);
      const response = await fetch(this.endpoints.flashcard, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Server error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating flashcard:', error);
      this.handleError(error);
      throw error;
    }
  }

  async getStudyTip(topic) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const response = await fetch(this.endpoints.studyTip, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Server error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting study tip:', error);
      this.handleError(error);
      throw error;
    }
  }

  handleError(error) {
    console.error('AI coach error:', error);
    const notification = document.createElement('div');
    notification.className =
      'fixed bottom-4 right-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-lg z-50';
    notification.innerHTML = `
            <p class="font-bold">Error</p>
            <p>${error.message || 'An error occurred with the AI Coach service'}</p>
        `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);

    return {
      error: true,
      message: `Failed to process request: ${error.message}`,
    };
  }
}

// Initialize and export the service
const aiCoachService = new AICoachService();
export { aiCoachService };
