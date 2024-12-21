interface AIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  topic: string;
  difficulty: string;
}

export interface Flashcard {
  front: string;
  back: string;
  topic: string;
  category: string;
}

class AIServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIServiceError';
  }
}

export const aiService = {
  private async makeRequest<T>(endpoint: string, data: any): Promise<T> {
    try {
      console.log(`Making request to ${endpoint}`, { 
        ...data, 
        sensitive: '[REDACTED]',
        timestamp: new Date().toISOString()
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
          status: response.status 
        }));
        
        // Enhanced error reporting
        console.error(`API Error (${response.status}):`, errorData);
        
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
      
      console.log(`Response from ${endpoint}:`, {
        success: responseData.success,
        timestamp: new Date().toISOString(),
        dataType: typeof responseData.data
      });
      
      return responseData;
    } catch (error) {
      console.error(`Error in ${endpoint}:`, {
        name: error.name,
        message: error.message,
        timestamp: new Date().toISOString()
      });
      
      if (error instanceof AIServiceError) {
        throw error;
      }
      
      // Provide more specific error messages
      if (error.message.includes('Failed to fetch')) {
        throw new AIServiceError('Network error. Please check your internet connection.');
      }
      
      throw new AIServiceError('Service temporarily unavailable. Please try again later.');
    }
  },

  async generateQuestions(topic: string, difficulty: string = 'intermediate', count: number = 5): Promise<AIResponse<Question[]>> {
    try {
      const data = await this.makeRequest<{ questions: Question[] }>('questions/generate', {
        topic,
        difficulty,
        count,
      });

      return {
        success: true,
        data: data.questions,
      };
    } catch (error) {
      console.error('Error generating questions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate questions',
      };
    }
  },

  async generateFlashcards(topic: string, count: number = 5): Promise<AIResponse<Flashcard[]>> {
    try {
      const data = await this.makeRequest<{ flashcards: Flashcard[] }>('flashcards/generate', {
        topic,
        count,
      });

      return {
        success: true,
        data: data.flashcards,
      };
    } catch (error) {
      console.error('Error generating flashcards:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate flashcards',
      };
    }
  },

  async analyzeStudyProgress(userData: Record<string, any>): Promise<AIResponse<any>> {
    try {
      const data = await this.makeRequest<any>('progress/analyze', userData);

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error analyzing study progress:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze study progress',
      };
    }
  },

  // Helper method to check API availability
  async checkAvailability(): Promise<boolean> {
    try {
      await this.makeRequest<{ status: string }>('health', {});
      return true;
    } catch (error) {
      console.error('AI service health check failed:', error);
      return false;
    }
  },
};
