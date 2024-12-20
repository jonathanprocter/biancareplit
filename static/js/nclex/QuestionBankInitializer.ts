import React, { useState, useEffect } from 'react';
import { createBaseQuestion } from '../utils/questionUtils';
import type {
  NCLEXQuestion,
  InitialQuestionBank,
  NCLEXQuestionData,
  CategoryData,
  QuestionBankConfig,
  MiddlewareConfig,
} from '../types/nclex';
import { z } from 'zod';

import { validateQuestion } from '../utils/questionUtils';

// Type definitions
export interface QuestionBankProviderProps {
  children: React.ReactNode;
}

export type QuestionBankContextType = NCLEXQuestionBank | null;

// Type guard
export function isQuestionBankInitialized(
  value: QuestionBankContextType
): value is NCLEXQuestionBank {
  return value !== null && value instanceof NCLEXQuestionBank;
}

// Initial question bank data
const initialQuestionBank: InitialQuestionBank = {
  questions: [
    {
      id: 'SAFE_BEG_001',
      question:
        'Which of the following is the first step in implementing standard precautions?',
      options: [
        'Put on sterile gloves',
        'Perform hand hygiene',
        'Wear a mask',
        'Put on a gown',
      ],
      correctAnswer: 1,
      explanation:
        'Hand hygiene is always the first step in standard precautions as it is the most effective way to prevent the spread of infections.',
      category: 'Safe and Effective Care Environment',
      subcategory: 'Infection Control',
      difficulty: 'BEGINNER',
      topic: 'Standard Precautions',
      rationale: {
        keyPoints: [
          'Hand hygiene is the foundation of infection prevention',
          'Must be performed before any other PPE steps',
          'Reduces transmission of microorganisms',
        ],
      },
      relatedConcepts: [
        'Personal Protective Equipment (PPE)',
        'Infection Prevention',
        'Standard Precautions Protocol',
      ],
    },
  ],
  categories: {
    'Safe and Effective Care Environment': {
      subcategories: [
        'Infection Control',
        'Safety and Infection Control',
        'Management of Care',
      ],
      questionCount: 0,
    },
    'Health Promotion and Maintenance': {
      subcategories: [
        'Growth and Development',
        'Prevention and Early Detection of Disease',
      ],
      questionCount: 0,
    },
    'Psychosocial Integrity': {
      subcategories: ['Coping and Adaptation', 'Psychosocial Adaptation'],
      questionCount: 0,
    },
    'Physiological Integrity': {
      subcategories: [
        'Basic Care and Comfort',
        'Pharmacological Therapies',
        'Reduction of Risk Potential',
      ],
      questionCount: 0,
    },
  },
};

interface UserMetrics {
  correctAnswers: number;
  totalAttempts: number;
  averageTime: number;
  categoryStrengths: Map<string, { correct: number; total: number }>;
}

interface CategoryProgress {
  totalUsers: number;
  averagePerformance: number;
}

interface DifficultyAdjustment {
  difficulty: string;
  lastUpdated: Date;
}

interface AdaptiveMetrics {
  userPerformance: Map<string, UserMetrics>;
  categoryProgress: Map<string, CategoryProgress>;
  difficultyAdjustments: Map<string, DifficultyAdjustment>;
  lastUpdate: Date | null;
}

interface QuestionBankCategoryData {
  subcategories: Set<string>;
  questionCount: number;
}

class NCLEXQuestionBank {
  private questions: Map<string, NCLEXQuestion>;
  private categories: Map<string, QuestionBankCategoryData>;
  private flashcards: Map<string, any>;
  private initialized: boolean;
  private adaptiveMetrics: AdaptiveMetrics;
  private middlewareConfig: MiddlewareConfig | null;

  constructor() {
    this.questions = new Map();
    this.categories = new Map();
    this.flashcards = new Map();
    this.initialized = false;
    this.middlewareConfig = null;
    this.adaptiveMetrics = {
      userPerformance: new Map(),
      categoryProgress: new Map(),
      difficultyAdjustments: new Map(),
      lastUpdate: null,
    };
  }

  setMiddlewareConfig(config: MiddlewareConfig) {
    this.middlewareConfig = config;
  }

  getMiddlewareConfig(): MiddlewareConfig | null {
    return this.middlewareConfig;
  }

  formatFlashcardBack(question: NCLEXQuestion): string {
    const correctAnswer = question.options[question.correctAnswer];
    const explanation = question.explanation;
    const keyPoints = Array.isArray(question.rationale?.keyPoints)
      ? question.rationale.keyPoints.join('\n')
      : '';
    const relatedConcepts = Array.isArray(question.relatedConcepts)
      ? question.relatedConcepts.join(', ')
      : '';

    return `Correct Answer: ${correctAnswer}\n\nExplanation:\n${explanation}${
      keyPoints ? `\n\nKey Points:\n${keyPoints}` : ''
    }${
      relatedConcepts ? `\n\nRelated Concepts:\n${relatedConcepts}` : ''
    }`.trim();
  }

  createFlashcard(question: NCLEXQuestion): any {
    try {
      return {
        id: `FC_${question.id}`,
        front: question.question,
        back: this.formatFlashcardBack(question),
        metadata: {
          questionId: question.id,
          category: question.category,
          subcategory: question.subcategory,
          difficulty: question.difficulty,
          topic: question.topic,
          relatedConcepts: question.relatedConcepts || [],
        },
        nextReviewDate: new Date(),
        lastReviewed: null,
        reviewCount: 0,
      };
    } catch (error) {
      console.error(
        `Failed to create flashcard for question ${question.id}:`,
        error
      );
      return null;
    }
  }

  async adjustQuestionDifficulty(
    userId: string,
    category: string
  ): Promise<string | undefined> {
    try {
      const userMetrics = this.adaptiveMetrics.userPerformance.get(userId);
      if (!userMetrics) return;

      const categoryStrength = userMetrics.categoryStrengths.get(category);
      if (!categoryStrength) return;

      const performance = categoryStrength.correct / categoryStrength.total;
      let newDifficulty: string;

      if (performance > 0.8) {
        newDifficulty = 'advanced';
      } else if (performance > 0.6) {
        newDifficulty = 'intermediate';
      } else {
        newDifficulty = 'beginner';
      }

      this.adaptiveMetrics.difficultyAdjustments.set(`${userId}-${category}`, {
        difficulty: newDifficulty,
        lastUpdated: new Date(),
      });

      return newDifficulty;
    } catch (error) {
      console.error('Error adjusting question difficulty:', error);
      throw error;
    }
  }

  async updateAdaptiveMetrics(
    userId: string,
    questionId: string,
    isCorrect: boolean,
    timeTaken: number
  ): Promise<UserMetrics | undefined> {
    try {
      const question = this.questions.get(questionId);
      if (!question) return;

      const userMetrics = this.adaptiveMetrics.userPerformance.get(userId) || {
        correctAnswers: 0,
        totalAttempts: 0,
        averageTime: 0,
        categoryStrengths: new Map(),
      };

      userMetrics.totalAttempts++;
      if (isCorrect) userMetrics.correctAnswers++;
      userMetrics.averageTime =
        (userMetrics.averageTime * (userMetrics.totalAttempts - 1) +
          timeTaken) /
        userMetrics.totalAttempts;

      const categoryStrength = userMetrics.categoryStrengths.get(
        question.category
      ) || {
        correct: 0,
        total: 0,
      };
      categoryStrength.total++;
      if (isCorrect) categoryStrength.correct++;
      userMetrics.categoryStrengths.set(question.category, categoryStrength);

      this.adaptiveMetrics.userPerformance.set(userId, userMetrics);
      this.adaptiveMetrics.lastUpdate = new Date();

      await this.adjustQuestionDifficulty(userId, question.category);

      return userMetrics;
    } catch (error) {
      console.error('Error updating adaptive metrics:', error);
      throw error;
    }
  }

  async initialize(): Promise<boolean> {
    try {
      console.log('Initializing NCLEX Question Bank...');

      Object.entries(initialQuestionBank.categories).forEach(
        ([category, data]) => {
          this.categories.set(category, {
            subcategories: new Set(data.subcategories),
            questionCount: 0,
          });
        }
      );

      initialQuestionBank.questions.forEach(questionData => {
        const question = this.createQuestion(questionData);
        this.questions.set(question.id, question);

        const categoryData = this.categories.get(question.category);
        if (categoryData) {
          categoryData.questionCount++;
          this.categories.set(question.category, categoryData);
        }

        const flashcard = this.createFlashcard(question);
        if (flashcard) {
          this.flashcards.set(flashcard.id, flashcard);
        }
      });

      this.initialized = true;
      console.log(
        `Loaded ${this.questions.size} questions across ${this.categories.size} categories`
      );

      return true;
    } catch (error) {
      console.error('Failed to initialize question bank:', error);
      throw new Error(`Question bank initialization failed: ${error}`);
    }
  }

  createQuestion(data: NCLEXQuestionData): NCLEXQuestion {
    const baseQuestion = createBaseQuestion(data);
    return {
      ...baseQuestion,
      rationale: data.rationale || { keyPoints: [] },
      relatedConcepts: data.relatedConcepts || [],
    };
  }

  getQuestionsByCategory(
    category: string,
    difficulty: string
  ): NCLEXQuestion[] {
    return Array.from(this.questions.values()).filter(
      q => q.category === category && q.difficulty === difficulty
    );
  }

  getDueFlashcards(): any[] {
    const now = new Date();
    return Array.from(this.flashcards.values())
      .filter(card => card.nextReviewDate <= now)
      .sort((a, b) => a.nextReviewDate - b.nextReviewDate);
  }

  getStats() {
    return {
      totalQuestions: this.questions.size,
      totalFlashcards: this.flashcards.size,
      categoryCounts: Object.fromEntries(
        Array.from(this.categories.entries()).map(([category, data]) => [
          category,
          data.questionCount,
        ])
      ),
    };
  }
}

const QuestionBankContext = React.createContext<QuestionBankContextType>(null);

const QuestionBankProvider: React.FC<QuestionBankProviderProps> = ({
  children,
}) => {
  const [questionBank, setQuestionBank] =
    useState<QuestionBankContextType>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeBank = async () => {
      try {
        const bank = new NCLEXQuestionBank();
        await bank.initialize();
        setQuestionBank(bank);
        setLoading(false);
      } catch (err) {
        console.error('Failed to initialize question bank:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    initializeBank();
  }, []);

  if (loading) {
    return React.createElement(
      'div',
      { className: 'text-center p-4' },
      React.createElement('div', {
        className:
          'animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2',
      }),
      React.createElement('div', null, 'Initializing question bank...')
    );
  }

  if (error) {
    return React.createElement(
      'div',
      { className: 'text-red-500 p-4 border border-red-200 rounded bg-red-50' },
      React.createElement('div', { className: 'font-semibold mb-1' }, 'Error'),
      React.createElement('div', null, error)
    );
  }

  return React.createElement(
    QuestionBankContext.Provider,
    { value: questionBank },
    children
  );
};

export { NCLEXQuestionBank, QuestionBankProvider, QuestionBankContext };
