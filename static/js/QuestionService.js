export class QuestionService {
  constructor() {
    this.initialized = false;
    this.questions = [];
    this.categories = new Set();
  }

  async initialize() {
    try {
      const response = await fetch('/api/questions/init');
      if (!response.ok) {
        throw new Error('Failed to initialize question service');
      }
      const data = await response.json();
      this.questions = data.questions || [];
      this.categories = new Set(data.categories || []);
      this.initialized = true;
      console.log('Question service initialized successfully');
      return true;
    } catch (error) {
      console.error('Question service initialization failed:', error);
      throw error;
    }
  }

  async getQuestions(category = null, difficulty = null) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (difficulty) params.append('difficulty', difficulty);

      const response = await fetch(`/api/questions?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch questions');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching questions:', error);
      throw error;
    }
  }

  async submitAnswer(questionId, answer) {
    try {
      const response = await fetch('/api/questions/submit-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId,
          answer,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit answer');
      }

      return await response.json();
    } catch (error) {
      console.error('Error submitting answer:', error);
      throw error;
    }
  }
}
