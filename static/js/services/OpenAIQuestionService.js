// services/OpenAIQuestionService.js
class OpenAIQuestionService {
  constructor() {
    this.initialized = false;
    this.questionCache = new Map();
    this.initializationPromise = null;
    this.categories = {
      pharmacology: {
        topics: ['Drug Classes', 'Administration', 'Side Effects', 'Interactions'],
        difficulties: ['beginner', 'intermediate', 'advanced'],
      },
      'medical-surgical': {
        topics: ['Cardiovascular', 'Respiratory', 'Neurological', 'Gastrointestinal'],
        difficulties: ['beginner', 'intermediate', 'advanced'],
      },
      pediatrics: {
        topics: ['Growth & Development', 'Common Conditions', 'Medications', 'Care'],
        difficulties: ['beginner', 'intermediate', 'advanced'],
      },
      maternal: {
        topics: ['Prenatal', 'Labor & Delivery', 'Postpartum', 'Newborn'],
        difficulties: ['beginner', 'intermediate', 'advanced'],
      },
      psychiatric: {
        topics: ['Disorders', 'Medications', 'Therapeutic Communication', 'Safety'],
        difficulties: ['beginner', 'intermediate', 'advanced'],
      },
      fundamentals: {
        topics: ['Basic Care', 'Assessment', 'Safety', 'Communication'],
        difficulties: ['beginner', 'intermediate', 'advanced'],
      },
    };
  }

  async initialize() {
    try {
      console.log('Initializing OpenAI Question Service...');
      await this.preWarmCache();
      this.initialized = true;
      this.startCacheMaintenance();
      console.log('OpenAI Question Service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize OpenAI Question Service:', error);
      throw error;
    }
  }

  async preWarmCache() {
    const initialQuestions = 2;
    for (const category of Object.keys(this.categories)) {
      try {
        const questions = await this.generateQuestionsForCategory(category, initialQuestions);
        this.questionCache.set(category, questions);
      } catch (error) {
        console.error(`Failed to pre-warm cache for ${category}:`, error);
      }
    }
  }

  async generateQuestionsForCategory(category, count = 1) {
    try {
      const response = await fetch('/api/nursing/questions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category,
          count,
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

      return data.questions;
    } catch (error) {
      console.error(`Error generating questions for ${category}:`, error);
      throw error;
    }
  }

  startCacheMaintenance() {
    setInterval(() => {
      this.maintainCache().catch((error) => {
        console.error('Cache maintenance error:', error);
      });
    }, 5 * 60 * 1000);
  }

  async maintainCache() {
    for (const category of Object.keys(this.categories)) {
      const cached = this.questionCache.get(category) || [];
      if (cached.length < 5) {
        try {
          const newQuestions = await this.generateQuestionsForCategory(category, 2);
          this.questionCache.set(category, [...cached, ...newQuestions]);
        } catch (error) {
          console.error(`Cache maintenance failed for ${category}:`, error);
        }
      }
    }
  }

  async getQuestions(category, count = 1) {
    if (!this.initialized) {
      throw new Error('OpenAI Question Service not initialized');
    }

    try {
      let questions = this.questionCache.get(category) || [];

      if (questions.length < count) {
        const newQuestions = await this.generateQuestionsForCategory(
          category,
          count - questions.length
        );
        questions = [...questions, ...newQuestions];
        this.questionCache.set(category, questions);
      }

      const selectedQuestions = questions.splice(0, count);
      this.questionCache.set(category, questions);

      return {
        questions: selectedQuestions,
        success: true,
        bufferSize: questions.length,
      };
    } catch (error) {
      console.error('Error getting questions:', error);
      return {
        questions: [],
        success: false,
        error: error.message,
      };
    }
  }
}

// Initialize and export the service
const openAIService = new OpenAIQuestionService();
export { openAIService };
