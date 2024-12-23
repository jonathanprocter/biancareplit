import { Configuration, OpenAIApi } from 'openai';

export class OpenAIService {
  private openai: OpenAIApi;

  constructor() {
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.openai = new OpenAIApi(configuration);
  }

  async generateResponse(prompt: string): Promise<string> {
    try {
      const response = await this.openai.createCompletion({
        model: 'gpt-3.5-turbo',
        prompt,
        max_tokens: 150,
        temperature: 0.7,
      });

      return response.data.choices[0]?.text?.trim() || 'No response generated';
    } catch (error) {
      console.error('OpenAI API error:', error instanceof Error ? error.message : 'Unknown error');
      throw new Error('Failed to generate response');
    }
  }

  async analyzeCode(code: string): Promise<string> {
    try {
      const response = await this.openai.createCompletion({
        model: 'gpt-3.5-turbo',
        prompt: `Review this code and provide suggestions:\n${code}`,
        max_tokens: 300,
        temperature: 0.3,
      });

      return response.data.choices[0]?.text?.trim() || 'No analysis generated';
    } catch (error) {
      console.error(
        'Code analysis error:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw new Error('Failed to analyze code');
    }
  }
}

export const openAIService = new OpenAIService();
