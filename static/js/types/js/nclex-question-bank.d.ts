export namespace NCLEX_CATEGORIES {
  let SAFE_EFFECTIVE_CARE: string;
  let HEALTH_PROMOTION: string;
  let PSYCHOSOCIAL: string;
  let PHYSIOLOGICAL: string;
}
export namespace DIFFICULTY_LEVELS {
  let BEGINNER: string;
  let INTERMEDIATE: string;
  let ADVANCED: string;
}
export class NCLEXQuestionBank {
  openai: OpenAI | null;
  questions: Map<any, any>;
  initialized: boolean;
  initialize(): Promise<void>;
  initializeBaseQuestions(): Promise<void>;
  loadBaseQuestions(category: any, difficulty: any): Promise<any>;
  addQuestion(question: any): void;
  getQuestions(category: any, difficulty: any): any[];
  generateNewQuestions(topic: any, difficulty: any, count?: number): Promise<any>;
  constructPrompt(topic: any, difficulty: any): string;
  parseAIResponse(response: any): any;
  getQuestionAnalytics(): {
    totalQuestions: number;
    questionsByCategory: any;
    questionsByDifficulty: any;
    aiGeneratedCount: number;
  };
  getQuestionDistribution(field: any): any;
}
export class QuestionGeneratorUI {
  constructor(questionBank: any);
  questionBank: any;
  container: HTMLDivElement | null;
  initialize(): void;
  setupUI(): void;
  displayNewQuestions(questions: any): void;
}
import OpenAI from 'openai';
