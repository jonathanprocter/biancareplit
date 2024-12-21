import OpenAI from 'openai';

// Service state tracking
let openaiInstance: OpenAI | null = null;
let isInitialized = false;

// Error types
class OpenAIServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenAIServiceError';
  }
}

// Initialize OpenAI client with error handling and retry logic
const initializeOpenAI = async (retries = 3): Promise<OpenAI> => {
  if (isInitialized && openaiInstance) {
    return openaiInstance;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        throw new OpenAIServiceError('OpenAI API key is not set in environment variables');
      }
      
      openaiInstance = new OpenAI({ 
        apiKey,
        dangerouslyAllowBrowser: true
      });

      // Verify the API key works
      await verifyAPIKey(openaiInstance);
      
      isInitialized = true;
      console.log('OpenAI Service: Successfully initialized');
      return openaiInstance;
    } catch (error) {
      console.error(`Failed to initialize OpenAI client (attempt ${attempt}/${retries}):`, error);
      
      if (attempt === retries) {
        isInitialized = false;
        openaiInstance = null;
        throw new OpenAIServiceError(`Failed to initialize after ${retries} attempts: ${error.message}`);
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw new OpenAIServiceError('Failed to initialize OpenAI client');
};

// Get the OpenAI instance, initializing if necessary
const getOpenAI = async (): Promise<OpenAI> => {
  try {
    if (!isInitialized || !openaiInstance) {
      return await initializeOpenAI();
    }
    return openaiInstance;
  } catch (error) {
    console.error('Failed to get OpenAI instance:', error);
    throw new OpenAIServiceError('Failed to get OpenAI instance');
  }
};

// Verify API key is valid
const verifyAPIKey = async (client: OpenAI): Promise<boolean> => {
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: "API key verification test" }],
      max_tokens: 5
    });
    
    console.log('OpenAI Service: API key verified successfully');
    return true;
  } catch (error) {
    console.error('OpenAI Service: API key verification failed:', error);
    throw new OpenAIServiceError('API key verification failed');
  }
};

// Initialize and verify on load
verifyAPIKey().catch(console.error);

interface AIResponse {
  content: string;
  error?: string;
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

export async function getMentorResponse(
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
  context?: {
    currentTopic?: string;
    recentPerformance?: number;
    strugglingAreas?: string[];
    learningStyle?: string;
  }
): Promise<AIResponse> {
  try {
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
        context?.learningStyle
          ? `They prefer ${context?.learningStyle} learning style.`
          : ''
      } Provide clear, concise guidance and explanations.`
    };

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [systemMessage, ...messages],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    return {
      content: response.choices[0].message.content || 'I apologize, but I couldn\'t generate a response. Please try again.',
    };
  } catch (error) {
    console.error('Error getting mentor response:', error);
    return {
      content: 'I apologize, but I encountered an error. Please try again.',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function generateLearningPath(
  context: {
    currentTopic?: string;
    recentPerformance?: number;
    strugglingAreas?: string[];
    learningStyle?: string;
  }
): Promise<LearningPathResponse> {
  try {
    if (!openai) {
      console.error('OpenAI client not initialized. Check if OPENAI_API_KEY is set.');
      throw new Error('OpenAI client not initialized');
    }

    const systemMessage = {
      role: 'system',
      content: `You are an expert learning path generator. Generate a personalized learning path based on the student's context. Format the response as a JSON object with 'milestones' and 'categoryProgress' arrays.`
    };

    const userMessage = {
      role: 'user',
      content: `Generate a learning path for a student with the following context:
        Current Topic: ${context.currentTopic || 'Not specified'}
        Recent Performance: ${context.recentPerformance || 'Not available'}%
        Struggling Areas: ${context.strugglingAreas?.join(', ') || 'None identified'}
        Learning Style: ${context.learningStyle || 'Not specified'}`
    };

    console.log('Generating learning path with context:', context);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [systemMessage, userMessage],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: "json_object" }
    });

    console.log('Received response from OpenAI');

    if (!response.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from OpenAI');
    }

    const result = JSON.parse(response.choices[0].message.content);
    console.log('Parsed learning path:', result);
    return result as LearningPathResponse;
  } catch (error) {
    console.error('Error generating learning path:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to generate learning path');
  }
}
