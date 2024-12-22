import OpenAI from 'openai';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024.
// do not change this unless explicitly requested by the user

class OpenAIServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenAIServiceError';
  }
}

// Singleton instance and initialization state
let openaiInstance: OpenAI | null = null;
let initializationPromise: Promise<OpenAI> | null = null;

// Initialize OpenAI client with error handling and retry logic
const initializeOpenAI = async (retries = 3): Promise<OpenAI> => {
  // Return existing initialization promise if one is in progress
  if (initializationPromise) {
    return initializationPromise;
  }

  // Create new initialization promise
  initializationPromise = (async () => {
    if (openaiInstance) {
      return openaiInstance;
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Initializing OpenAI client (attempt ${attempt}/${retries})...`);

        const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
        if (!apiKey) {
          throw new OpenAIServiceError('OpenAI API key is not set in environment variables');
        }

        const instance = new OpenAI({
          apiKey,
          dangerouslyAllowBrowser: true,
        });

        // Verify the API key works with a minimal request
        const response = await instance.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'system', content: 'API key verification test' }],
          max_tokens: 5,
          response_format: { type: 'json_object' },
        });

        if (!response?.choices?.[0]?.message?.content) {
          throw new OpenAIServiceError('Invalid response during API key verification');
        }

        openaiInstance = instance;
        console.log('OpenAI Service: Successfully initialized');
        return instance;
      } catch (error) {
        console.error(`Failed to initialize OpenAI client (attempt ${attempt}/${retries}):`, error);

        if (attempt === retries) {
          throw new OpenAIServiceError(
            `Failed to initialize after ${retries} attempts: ${error instanceof Error ? error.message : String(error)}`,
          );
        }

        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new OpenAIServiceError('Failed to initialize OpenAI client');
  })();

  try {
    return await initializationPromise;
  } finally {
    initializationPromise = null;
  }
};

// Get or initialize the OpenAI instance
const getOpenAI = async (): Promise<OpenAI> => {
  try {
    return await initializeOpenAI();
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    console.error('Failed to get OpenAI instance:', error);
    throw error instanceof OpenAIServiceError
      ? error
      : new OpenAIServiceError('Failed to get OpenAI instance');
  }
};

interface AIResponse {
  content: string;
  error?: string;
}

export async function getMentorResponse(
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
  context?: {
    currentTopic?: string;
    recentPerformance?: number;
    strugglingAreas?: string[];
    learningStyle?: string;
  },
): Promise<AIResponse> {
  try {
    const openai = await getOpenAI();

    const systemMessage = {
      role: 'system',
      content: `You are an expert NCLEX tutor and mentor. ${
        context?.currentTopic ? `The student is currently studying ${context.currentTopic}.` : ''
      } ${
        context?.recentPerformance
          ? `Their recent performance is ${context.recentPerformance}%.`
          : ''
      } ${
        context?.strugglingAreas?.length
          ? `They are struggling with: ${context.strugglingAreas.join(', ')}.`
          : ''
      } ${
        context?.learningStyle ? `They prefer ${context?.learningStyle} learning style.` : ''
      } Provide clear, concise guidance and explanations.`,
    };

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [systemMessage, ...messages],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    try {
      const parsedContent = JSON.parse(content || '{"content": "No response generated"}');
      return {
        content:
          parsedContent.content ||
          content ||
          "I apologize, but I couldn't generate a response. Please try again.",
      };
    } catch {
      return {
        content: content || "I apologize, but I couldn't generate a response. Please try again.",
      };
    }
  } catch (error) {
    console.error('Error getting mentor response:', error);
    return {
      content: 'I apologize, but I encountered an error. Please try again.',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

interface LearningPathResponse {
  milestones: Array<{
    title: string;
    description: string;
    category: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    xpPoints: number;
    aiRecommended: boolean;
  }>;
  categoryProgress: Array<{
    category: string;
    progress: number;
    totalQuestions: number;
    correctAnswers: number;
  }>;
}

export async function generateLearningPath(context: {
  currentTopic?: string;
  recentPerformance?: number;
  strugglingAreas?: string[];
  learningStyle?: string;
}): Promise<LearningPathResponse> {
  try {
    const openai = await getOpenAI();

    const systemMessage = {
      role: 'system',
      content: `You are an expert learning path generator. Generate a personalized learning path based on the student's context. Format the response as a JSON object with 'milestones' and 'categoryProgress' arrays.`,
    };

    const userMessage = {
      role: 'user',
      content: `Generate a learning path for a student with the following context:
        Current Topic: ${context.currentTopic || 'Not specified'}
        Recent Performance: ${context.recentPerformance || 'Not available'}%
        Struggling Areas: ${context.strugglingAreas?.join(', ') || 'None identified'}
        Learning Style: ${context.learningStyle || 'Not specified'}`,
    };

    console.log('Generating learning path with context:', context);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [systemMessage, userMessage],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      throw new OpenAIServiceError('No content received from OpenAI');
    }

    try {
      const result = JSON.parse(content);
      if (!result.milestones || !result.categoryProgress) {
        throw new OpenAIServiceError('Invalid response format: missing required fields');
      }
      console.log('Successfully generated learning path');
      return result as LearningPathResponse;
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      throw new OpenAIServiceError(
        'Failed to parse OpenAI response: ' +
          (parseError instanceof Error ? parseError.message : String(parseError)),
      );
    }
  } catch (error) {
    console.error('Error generating learning path:', error);
    throw new OpenAIServiceError(
      error instanceof Error ? error.message : 'Failed to generate learning path',
    );
  }
}
