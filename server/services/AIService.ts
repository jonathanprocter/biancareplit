import { OpenAI } from 'openai';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024.
// do not change this unless explicitly requested by the user

interface Question {
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string;
  topic: string;
  difficulty: string;
}

interface Flashcard {
  front: string;
  back: string;
  topic: string;
  category: string;
}

interface StudyProgress {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  estimated_proficiency: number;
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
      this.initializationError = error instanceof Error ? error : new Error('Failed to initialize OpenAI client');
      console.error('AIService: Initialization failed -', this.initializationError.message);
    }
  }

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  private async ensureConnection(): Promise<void> {
    if (this.connectionValidated) return;
    if (this.initializationError) throw this.initializationError;
    if (!this.openai) throw new Error('OpenAI client not initialized');

    try {
      console.info('AIService: Validating OpenAI connection...');
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'system', content: 'Connection test' }],
        max_tokens: 5,
        response_format: { type: 'json_object' },
      });

      if (!response.choices?.[0]?.message?.content) {
        throw new Error('Invalid response format from OpenAI API');
      }

      this.connectionValidated = true;
      console.info('AIService: Connection validated successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('AIService: Connection validation failed -', errorMessage);
      throw new Error(`OpenAI connection validation failed: ${errorMessage}`);
    }
  }

  async generate_questions(
    topic: string,
    difficulty: string = 'intermediate',
    count: number = 5,
  ): Promise<Question[]> {
    try {
      await this.ensureConnection();
      console.info(`AIService: Generating ${count} questions about "${topic}" at ${difficulty} difficulty`);

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
      
      if (!result.strengths || !result.weaknesses || !result.recommendations || 
          !Array.isArray(result.strengths) || !Array.isArray(result.weaknesses) || 
          !Array.isArray(result.recommendations) || typeof result.estimated_proficiency !== 'number') {
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
