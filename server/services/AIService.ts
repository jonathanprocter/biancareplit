import { OpenAI } from 'openai';
import { config } from '../config';

interface Question {
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string;
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
  private openai: OpenAI;
  private static instance: AIService;
  private initialized: boolean = false;

  private constructor() {
    const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey || apiKey.trim() === '') {
      console.error('AIService: Missing API key in environment variables');
      throw new Error('OpenAI API key is required. Please check your environment variables.');
    }

    try {
      this.openai = new OpenAI({
        apiKey: apiKey.trim(),
      });
      
      // Set initialized to false until first successful API call
      this.initialized = false;
      console.log('AIService: OpenAI client initialized with API key');
    } catch (error) {
      console.error('AIService: Failed to initialize client:', error);
      throw new Error('Failed to initialize OpenAI client. Please check your configuration.');
    }
  }

  private async ensureInitialized() {
    if (this.initialized) return;

    try {
      // Simple validation request
      await this.openai.chat.completions.create({
        messages: [{ role: 'system', content: 'Test' }],
        model: 'gpt-4',
        max_tokens: 1,
      });

      this.initialized = true;
      console.log('AIService: API key validated successfully');
    } catch (error: any) {
      console.error('AIService: API key validation failed', {
        error: error.message,
        type: error.type,
        status: error.status,
      });

      // Provide more specific error messages based on error type
      if (error.status === 401) {
        throw new Error('Invalid API key. Please check your OpenAI API key.');
      } else if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (error.message.includes('network')) {
        throw new Error('Network error during API validation. Please check your connection.');
      }

      throw new Error('Failed to validate OpenAI API key. Please try again later.');
    }
  }

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  private async validateConnection() {
    if (this.initialized) return;

    try {
      console.log('AIService: Validating OpenAI connection...');
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "system", content: "Connection test" }],
        max_tokens: 5
      });

      if (response.choices && response.choices.length > 0) {
        this.initialized = true;
        console.log('AIService: Successfully validated OpenAI connection');
      }
    } catch (error) {
      console.error('AIService: Connection validation failed:', error);
      throw new Error(`Failed to validate OpenAI connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generate_questions(topic: string, difficulty: string = 'intermediate', count: number = 5): Promise<Question[]> {
    await this.ensureInitialized();

    try {
      console.log(`Generating ${count} questions about ${topic} at ${difficulty} difficulty`);
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{
          role: "system",
          content: `Generate ${count} ${difficulty}-level NCLEX-style questions about ${topic}. Format as JSON array with objects containing: question, options (array of 4 strings), correct_answer (0-3 index), explanation.`
        }],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content);
      console.log(`Successfully generated ${result.questions?.length || 0} questions`);
      return result.questions || [];
    } catch (error) {
      console.error('Error generating questions:', error);
      throw new Error(`Failed to generate questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generate_flashcards(topic: string, count: number = 5): Promise<Flashcard[]> {
    await this.ensureInitialized();

    try {
      console.log(`Generating ${count} flashcards about ${topic}`);
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{
          role: "system",
          content: `Create ${count} flashcards for studying ${topic}. Format as JSON array with objects containing: front (question/term), back (answer/definition), topic, category.`
        }],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content);
      console.log(`Successfully generated ${result.flashcards?.length || 0} flashcards`);
      return result.flashcards || [];
    } catch (error) {
      console.error('Error generating flashcards:', error);
      throw new Error(`Failed to generate flashcards: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async analyze_study_progress(userData: any): Promise<StudyProgress> {
    await this.ensureInitialized();

    try {
      console.log('Analyzing study progress data');
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{
          role: "system",
          content: `Analyze this study progress data and provide insights. Format response as JSON with: strengths (array), weaknesses (array), recommendations (array), estimated_proficiency (0-100).

          User Data: ${JSON.stringify(userData)}`
        }],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content);
      console.log('Successfully analyzed study progress');
      return result;
    } catch (error) {
      console.error('Error analyzing study progress:', error);
      throw new Error(`Failed to analyze study progress: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}