import OpenAI from 'openai';

// Define NCLEX categories and difficulty levels
export const NCLEX_CATEGORIES = {
  SAFE_EFFECTIVE_CARE: 'Safe and Effective Care Environment',
  HEALTH_PROMOTION: 'Health Promotion and Maintenance',
  PSYCHOSOCIAL: 'Psychosocial Integrity',
  PHYSIOLOGICAL: 'Physiological Integrity',
};

export const DIFFICULTY_LEVELS = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
};

// Enhanced Question class with detailed rationales
export class NCLEXQuestion {
  constructor(data) {
    this.id = data.id || crypto.randomUUID();
    this.question = data.question;
    this.options = data.options;
    this.correctAnswer = data.correctAnswer;
    this.explanation = data.explanation;
    this.category = data.category;
    this.subcategory = data.subcategory;
    this.difficulty = data.difficulty;
    this.topic = data.topic;
    this.isAIGenerated = data.isAIGenerated || false;
    this.createdAt = data.createdAt || new Date();
    this.rationale = data.rationale || {};
    this.commonMistakes = data.commonMistakes || [];
    this.relatedConcepts = data.relatedConcepts || [];
  }

  toFlashcard() {
    return new NCLEXFlashcard({
      front: this.question,
      back: this.createDetailedAnswer(),
      metadata: {
        questionId: this.id,
        category: this.category,
        subcategory: this.subcategory,
        difficulty: this.difficulty,
        topic: this.topic,
        createdFrom: 'incorrect_answer',
      },
    });
  }

  createDetailedAnswer() {
    return `
            Correct Answer: ${this.correctAnswer}

            Detailed Rationale:
            ${this.rationale.mainExplanation || this.explanation}

            Why this is the best answer:
            ${this.rationale.correctAnswerJustification || ''}

            Why other options are incorrect:
            ${this.formatIncorrectAnswerExplanations()}

            Key Points to Remember:
            ${this.rationale.keyPoints || ''}

            Related Concepts:
            ${this.relatedConcepts.join(', ')}
        `;
  }

  formatIncorrectAnswerExplanations() {
    if (!this.rationale.incorrectAnswerExplanations) return '';
    return Object.entries(this.rationale.incorrectAnswerExplanations)
      .map(([option, explanation]) => `${option}: ${explanation}`)
      .join('\n');
  }
}

// Flashcard implementation with spaced repetition
export class NCLEXFlashcard {
  constructor(data) {
    this.id = crypto.randomUUID();
    this.front = data.front;
    this.back = data.back;
    this.metadata = data.metadata;
    this.createdAt = new Date();
    this.lastReviewed = null;
    this.reviewCount = 0;
    this.confidence = 0;
    this.nextReviewDate = new Date();
  }

  updateReviewSchedule(confidence) {
    this.confidence = confidence;
    this.reviewCount++;
    this.lastReviewed = new Date();
    const daysUntilNextReview = this.calculateNextReviewInterval();
    this.nextReviewDate = new Date(Date.now() + daysUntilNextReview * 24 * 60 * 60 * 1000);
  }

  calculateNextReviewInterval() {
    const baseInterval = 24;
    const confidenceMultiplier = Math.max(0.5, this.confidence / 5);
    const reviewMultiplier = Math.log(this.reviewCount + 1) + 1;
    return Math.ceil((baseInterval * confidenceMultiplier * reviewMultiplier) / 24);
  }
}

// Main question bank implementation
export class NCLEXQuestionBank {
  constructor() {
    this.questions = new Map();
    this.flashcards = new Map();
    this.userProgress = new Map();
    this.initialized = false;
  }

  async initialize() {
    try {
      // Initialize OpenAI client
      const response = await fetch('/api/openai-key');
      const { apiKey } = await response.json();
      this.openai = new OpenAI({ apiKey });
      await this.initializeBaseQuestions();
      this.initialized = true;
      console.log('NCLEX Question Bank initialized successfully');
    } catch (error) {
      console.error('Failed to initialize NCLEX Question Bank:', error);
      throw error;
    }
  }

  async handleQuestionAnswer(questionId, userAnswer, confidenceLevel) {
    const question = this.questions.get(questionId);
    if (!question) throw new Error('Question not found');

    const isCorrect = userAnswer === question.correctAnswer;
    this.updateUserProgress(questionId, isCorrect, confidenceLevel);

    if (!isCorrect) {
      const flashcard = question.toFlashcard();
      this.flashcards.set(flashcard.id, flashcard);
      flashcard.updateReviewSchedule(Math.min(2, confidenceLevel));
    }

    return {
      isCorrect,
      correctAnswer: question.correctAnswer,
      explanation: question.createDetailedAnswer(),
      flashcardCreated: !isCorrect,
    };
  }

  updateUserProgress(questionId, isCorrect, confidenceLevel) {
    const progress = this.userProgress.get(questionId) || {
      attempts: 0,
      correctAttempts: 0,
      lastAttempt: null,
      confidenceLevels: [],
    };

    progress.attempts++;
    if (isCorrect) progress.correctAttempts++;
    progress.lastAttempt = new Date();
    progress.confidenceLevels.push(confidenceLevel);

    this.userProgress.set(questionId, progress);
  }

  getDueFlashcards() {
    const now = new Date();
    return Array.from(this.flashcards.values())
      .filter((card) => card.nextReviewDate <= now)
      .sort((a, b) => a.nextReviewDate - b.nextReviewDate);
  }

  getFlashcardAnalytics() {
    const flashcardCount = this.flashcards.size;
    const categoryDistribution = {};
    const difficultyDistribution = {};

    this.flashcards.forEach((card) => {
      const { category, difficulty } = card.metadata;
      categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
      difficultyDistribution[difficulty] = (difficultyDistribution[difficulty] || 0) + 1;
    });

    return {
      totalFlashcards: flashcardCount,
      byCategory: categoryDistribution,
      byDifficulty: difficultyDistribution,
      averageConfidence: this.calculateAverageConfidence(),
    };
  }

  calculateAverageConfidence() {
    const cards = Array.from(this.flashcards.values());
    if (cards.length === 0) return 0;
    return cards.reduce((sum, card) => sum + card.confidence, 0) / cards.length;
  }
}
