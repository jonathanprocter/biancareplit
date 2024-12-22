import { OpenAI } from 'openai';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024.
// do not change this unless explicitly requested by the user

/**
 * Represents a medical education question with multiple choice options
 * @interface Question
 */
interface Question {
  /** The question text */
  question: string;
  /** Array of possible answer choices */
  options: string[];
  /** Index of the correct answer (0-based) */
  correct_answer: number;
  /** Detailed explanation of the answer for learning purposes */
  explanation: string;
  /** Medical topic/subject area (e.g., "Anatomy", "Pathology") */
  topic: string;
  /** Difficulty level ("easy", "medium", "hard") */
  difficulty: string;
  /** Clinical relevance or context */
  clinical_context?: string;
  /** References to medical literature */
  references?: string[];
}

/**
 * Represents a medical education flashcard for spaced repetition learning
 * @interface Flashcard
 */
interface Flashcard {
  /** Question or medical term on the front */
  front: string;
  /** Answer or definition on the back */
  back: string;
  /** Medical topic/subject area */
  topic: string;
  /** Classification category (e.g., "Anatomy", "Pharmacology") */
  category: string;
  /** Clinical examples or case studies */
  clinical_examples?: string[];
  /** Visual aids or diagrams (base64 encoded) */
  visual_aids?: string[];
  /** Evidence-based medicine references */
  references?: string[];
}

/**
 * Tracks student progress and provides personalized learning recommendations
 * @interface StudyProgress
 */
interface StudyProgress {
  /** Areas of demonstrated competency */
  strengths: string[];
  /** Topics requiring additional focus */
  weaknesses: string[];
  /** Personalized study recommendations */
  recommendations: string[];
  /** Overall proficiency score (0-100) */
  estimated_proficiency: number;
  /** Breakdown by medical specialty */
  specialty_breakdown?: Record<string, number>;
  /** Recommended next learning objectives */
  next_objectives?: string[];
  /** Time-based learning analytics */
  learning_analytics?: {
    study_time: number;
    retention_rate: number;
    practice_frequency: number;
  };
}

export class AIService {
  private openai: OpenAI | null = null;
  private static instance: AIService | null = null;
  private connectionValidated: boolean = false;
  private initializationError: Error | null = null;

  private constructor() {
    this.initializeOpenAI();
  }

  private initializeOpenAI(): void {
    const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;

    if (!apiKey?.trim()) {
      this.initializationError = new Error('Missing OpenAI API key in environment variables');
      console.error('AIService:', this.initializationError.message);
      return;
    }

    try {
      this.openai = new OpenAI({ apiKey: apiKey.trim() });
      console.info('AIService: OpenAI client initialized successfully');
    } catch (error) {
      this.initializationError =
        error instanceof Error ? error : new Error('Failed to initialize OpenAI client');
      console.error('AIService: Initialization failed -', this.initializationError.message);
    }
  }

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  /**
   * Validates the OpenAI connection and model availability
   * Implements retry logic and comprehensive error handling
   * @private
   * @throws {Error} If connection validation fails after retries
   */
  public async ensureConnection(): Promise<void> {
    if (this.connectionValidated) return;
    if (this.initializationError) throw this.initializationError;
    if (!this.openai) throw new Error('OpenAI client not initialized');

    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000; // 2 seconds

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.info(
          `AIService: Validating OpenAI connection (attempt ${attempt}/${MAX_RETRIES})...`,
        );

        // Simple validation test
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'Respond with a simple "ok" to validate the connection.',
            },
          ],
          max_tokens: 10,
        });

        if (!response.choices?.[0]?.message?.content) {
          throw new Error('Invalid response format from OpenAI API');
        }

        this.connectionValidated = true;
        console.info('AIService: Connection and model validated successfully');
        return;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error(`AIService: Connection validation attempt ${attempt} failed -`, {
          error: errorMessage,
          timestamp: new Date().toISOString(),
          attempt,
          remainingRetries: MAX_RETRIES - attempt,
        });

        if (attempt === MAX_RETRIES) {
          throw new Error(
            `OpenAI connection validation failed after ${MAX_RETRIES} attempts: ${errorMessage}`,
          );
        }

        // Exponential backoff
        const delay = RETRY_DELAY * Math.pow(2, attempt - 1);
        console.info(`AIService: Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  async generate_questions(
    topic: string,
    difficulty: string = 'intermediate',
    count: number = 5,
  ): Promise<Question[]> {
    try {
      await this.ensureConnection();
      console.info(
        `AIService: Generating ${count} questions about "${topic}" at ${difficulty} difficulty`,
      );

      const response = await this.openai!.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Generate ${count} ${difficulty}-level NCLEX-style questions about ${topic}. Format as JSON array with objects containing: question, options (array of 4 strings), correct_answer (0-3 index), explanation, topic, difficulty.`,
          },
        ],
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0].message.content);

      if (!Array.isArray(result.questions)) {
        throw new Error('Invalid response format: questions array not found');
      }

      console.info(`AIService: Successfully generated ${result.questions.length} questions`);
      return result.questions;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('AIService: Failed to generate questions -', errorMessage);
      throw new Error(`Failed to generate questions: ${errorMessage}`);
    }
  }

  async generate_flashcards(topic: string, count: number = 5): Promise<Flashcard[]> {
    try {
      await this.ensureConnection();
      console.info(`AIService: Generating ${count} flashcards about "${topic}"`);

      const response = await this.openai!.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Create ${count} flashcards for studying ${topic}. Format as JSON array with objects containing: front (question/term), back (answer/definition), topic, category.`,
          },
        ],
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0].message.content);

      if (!Array.isArray(result.flashcards)) {
        throw new Error('Invalid response format: flashcards array not found');
      }

      console.info(`AIService: Successfully generated ${result.flashcards.length} flashcards`);
      return result.flashcards;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('AIService: Failed to generate flashcards -', errorMessage);
      throw new Error(`Failed to generate flashcards: ${errorMessage}`);
    }
  }

  async analyze_study_progress(userData: Record<string, unknown>): Promise<StudyProgress> {
    try {
      await this.ensureConnection();
      console.info('AIService: Analyzing study progress data');

      const response = await this.openai!.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Analyze this study progress data and provide insights. Format response as JSON with: strengths (array), weaknesses (array), recommendations (array), estimated_proficiency (0-100).

          User Data: ${JSON.stringify(userData)}`,
          },
        ],
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0].message.content);

      if (
        !result.strengths ||
        !result.weaknesses ||
        !result.recommendations ||
        !Array.isArray(result.strengths) ||
        !Array.isArray(result.weaknesses) ||
        !Array.isArray(result.recommendations) ||
        typeof result.estimated_proficiency !== 'number'
      ) {
        throw new Error('Invalid response format: missing required fields');
      }

      console.info('AIService: Successfully analyzed study progress');
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('AIService: Failed to analyze study progress -', errorMessage);
      throw new Error(`Failed to analyze study progress: ${errorMessage}`);
    }
  }
}
