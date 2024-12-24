import { Configuration, OpenAIApi } from 'openai';

export class OpenAIService {
  private openai: OpenAIApi;

  constructor() {
    const configuration = new Configuration({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    });
    this.openai = new OpenAIApi(configuration);
  }

  async generateResponse(prompt: string): Promise<string> {
    try {
      const response = await this.openai.createCompletion({
        model: 'text-davinci-003',
        prompt,
        max_tokens: 150,
      });
      return response.data.choices[0]?.text || '';
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }
}

export default new OpenAIService();
