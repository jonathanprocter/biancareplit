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
      console.warn('AIService: Missing API key in environment variables');
      this.initialized = false;
      return;
    }

    try {
      this.openai = new OpenAI({
        apiKey: apiKey.trim(),
      });
      this.initialized = true;
      console.log('AIService: OpenAI client initialized with API key');
    } catch (error) {
      console.warn('AIService: Failed to initialize client:', error);
      this.initialized = false;
    }
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      console.warn('AIService: Not initialized. Some features requiring AI capabilities may be limited.');
      return false;
    }
    return true;
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
    if (!await this.ensureInitialized()) {
      console.warn('AIService: Cannot generate questions - service not initialized');
      return [];
    }

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
      console.warn('Error generating questions:', error);
      return [];
    }
  }

  async generate_flashcards(topic: string, count: number = 5): Promise<Flashcard[]> {
    if (!await this.ensureInitialized()) {
      console.warn('AIService: Cannot generate flashcards - service not initialized');
      return [];
    }

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
      console.warn('Error generating flashcards:', error);
      return [];
    }
  }

  async analyze_study_progress(userData: any): Promise<StudyProgress> {
    if (!await this.ensureInitialized()) {
      console.warn('AIService: Cannot analyze study progress - service not initialized');
      return {
        strengths: [],
        weaknesses: [],
        recommendations: ['AI service not available. Please try again later.'],
        estimated_proficiency: 0
      };
    }

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
      console.warn('Error analyzing study progress:', error);
      return {
        strengths: [],
        weaknesses: [],
        recommendations: ['Error analyzing progress. Please try again later.'],
        estimated_proficiency: 0
      };
    }
  }
}