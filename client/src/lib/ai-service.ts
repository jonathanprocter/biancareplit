import { logError, logInfo } from '@/lib/logger';

export interface AIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface Question {
  id: string;
  text: string;
  options?: string[];
  answer?: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  topic?: string;
}

class AIServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIServiceError';
  }
}

async function makeRequest<T>(endpoint: string, data: Record<string, unknown>): Promise<T> {
  try {
    logInfo(`Making request to ${endpoint}`, {
      ...data,
      sensitive: '[REDACTED]',
      timestamp: new Date().toISOString(),
    });

    const response = await fetch(`/api/ai/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: 'Unknown error',
        status: response.status,
      }));

      logError(`API Error (${response.status}):`, errorData);

      if (response.status === 401) {
        throw new AIServiceError('Authentication failed. Please check your API key configuration.');
      } else if (response.status === 403) {
        throw new AIServiceError('Access denied. Please verify your API permissions.');
      } else if (response.status >= 500) {
        throw new AIServiceError('Server error. Please try again later.');
      }

      throw new AIServiceError(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    if (!responseData.success && responseData.error) {
      throw new AIServiceError(responseData.error);
    }

    logInfo(`Response from ${endpoint}:`, {
      success: responseData.success,
      timestamp: new Date().toISOString(),
      dataType: typeof responseData.data,
    });

    return responseData;
  } catch (error) {
    logError(`Error in ${endpoint}:`, {
      name: error instanceof Error ? error.name : 'Unknown Error',
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });

    if (error instanceof AIServiceError) {
      throw error;
    }

    if (error instanceof Error && error.message.includes('Failed to fetch')) {
      throw new AIServiceError('Network error. Please check your internet connection.');
    }

    throw new AIServiceError('Service temporarily unavailable. Please try again later.');
  }
}

export const aiService = {
  async generateQuestions(
    topic: string,
    difficulty = 'intermediate',
    count = 5,
  ): Promise<AIResponse<Question[]>> {
    try {
      const data = await makeRequest<{ questions: Question[] }>('questions/generate', {
        topic,
        difficulty,
        count,
      });

      return {
        success: true,
        data: data.questions,
      };
    } catch (error) {
      logError('Error generating questions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate questions',
      };
    }
  },

  async generateFlashcards(topic: string, count = 5): Promise<AIResponse<Flashcard[]>> {
    try {
      const data = await makeRequest<{ flashcards: Flashcard[] }>('flashcards/generate', {
        topic,
        count,
      });

      return {
        success: true,
        data: data.flashcards,
      };
    } catch (error) {
      logError('Error generating flashcards:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate flashcards',
      };
    }
  },

  async analyzeStudyProgress(userData: Record<string, unknown>): Promise<
    AIResponse<{
      strengths: string[];
      weaknesses: string[];
      recommendations: string[];
      estimated_proficiency: number;
    }>
  > {
    try {
      const data = await makeRequest<{
        strengths: string[];
        weaknesses: string[];
        recommendations: string[];
        estimated_proficiency: number;
      }>('progress/analyze', userData);

      return {
        success: true,
        data,
      };
    } catch (error) {
      logError('Error analyzing study progress:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze study progress',
      };
    }
  },

  async checkAvailability(): Promise<boolean> {
    try {
      await makeRequest<{ status: string }>('health', {});
      return true;
    } catch (error) {
      logError('AI service health check failed:', error);
      return false;
    }
  },
};

export type { AIResponse, Question, Flashcard };
