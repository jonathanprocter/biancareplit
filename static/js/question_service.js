// QuestionService.js
class QuestionService {
  constructor() {
    // Buffer to store pre-generated questions
    this.questionBuffer = new Map();
    // Minimum buffer size for each category
    this.MIN_BUFFER_SIZE = 10;
    // Maximum number of retry attempts
    this.MAX_RETRIES = 3;
    // Initialize the buffer fill promise
    this.bufferFillPromise = null;
    // Track failed attempts
    this.failedAttempts = new Map();
  }

  async initialize() {
    console.log('Initializing QuestionService...');
    // Categories we want to maintain buffers for
    const categories = [
      'pharmacology',
      'medical-surgical',
      'pediatrics',
      'maternal',
      'psychiatric',
      'fundamentals',
    ];

    try {
      // Initialize buffers for all categories
      for (const category of categories) {
        this.questionBuffer.set(category, []);
        this.failedAttempts.set(category, 0);
      }

      // Start the initial buffer fill
      await this.fillBuffers();

      // Set up periodic buffer maintenance
      this.startBufferMaintenance();

      console.log('QuestionService initialized successfully');
    } catch (error) {
      console.error('Error initializing QuestionService:', error);
      throw error;
    }
  }

  async fillBuffers() {
    // Only allow one fill operation at a time
    if (this.bufferFillPromise) {
      return this.bufferFillPromise;
    }

    this.bufferFillPromise = (async () => {
      for (const [category, buffer] of this.questionBuffer.entries()) {
        if (buffer.length < this.MIN_BUFFER_SIZE) {
          await this.fillCategoryBuffer(category);
        }
      }
    })();

    try {
      await this.bufferFillPromise;
    } finally {
      this.bufferFillPromise = null;
    }
  }

  async fillCategoryBuffer(category) {
    const buffer = this.questionBuffer.get(category) || [];
    const needed = this.MIN_BUFFER_SIZE - buffer.length;

    if (needed <= 0) return;

    console.log(`Filling buffer for ${category}, need ${needed} questions`);

    try {
      const response = await fetch('/api/nursing/questions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category,
          count: needed,
          difficulty: 'mixed',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.questions || !Array.isArray(data.questions)) {
        throw new Error('Invalid response format');
      }

      // Add new questions to buffer
      buffer.push(...data.questions);
      this.questionBuffer.set(category, buffer);

      // Reset failed attempts counter on success
      this.failedAttempts.set(category, 0);
    } catch (error) {
      const failedAttempts = this.failedAttempts.get(category) || 0;
      this.failedAttempts.set(category, failedAttempts + 1);
      console.error(`Failed to fill buffer for ${category}:`, error);
      throw error;
    }
  }

  startBufferMaintenance() {
    // Check buffer levels every minute
    setInterval(() => {
      this.fillBuffers().catch((error) => {
        console.error('Error in buffer maintenance:', error);
      });
    }, 60000);

    // Listen for window focus events to refresh buffers
    window.addEventListener('focus', () => {
      this.fillBuffers().catch((error) => {
        console.error('Error in buffer refresh:', error);
      });
    });
  }

  async getQuestions(category, count = 1) {
    try {
      const buffer = this.questionBuffer.get(category) || [];

      // If buffer is getting low, trigger a fill
      if (buffer.length < this.MIN_BUFFER_SIZE) {
        this.fillBuffers().catch((error) => {
          console.error('Error filling buffers:', error);
        });
      }

      // Return requested number of questions from buffer
      const questions = buffer.splice(0, count);
      this.questionBuffer.set(category, buffer);

      return {
        questions,
        success: true,
        bufferSize: buffer.length,
      };
    } catch (error) {
      console.error(`Error getting questions for ${category}:`, error);
      return {
        questions: [],
        success: false,
        error: error.message,
      };
    }
  }
}

// Initialize and export the service
const questionService = new QuestionService();

// Start the service when the page loads
document.addEventListener('DOMContentLoaded', () => {
  questionService.initialize().catch((error) => {
    console.error('Failed to initialize QuestionService:', error);
    showErrorNotification('Question service initialization failed. Please refresh the page.');
  });
});

export { questionService };
