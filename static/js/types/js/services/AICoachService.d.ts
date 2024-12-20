export const aiCoachService: AICoachService;
declare class AICoachService {
  baseUrl: string;
  endpoints: {
    flashcard: string;
    studyTip: string;
  };
  retryAttempts: number;
  retryDelay: number;
  initialized: boolean;
  initialize(): Promise<boolean>;
  healthCheck(): Promise<boolean>;
  createFlashcard(topic: any): Promise<any>;
  getStudyTip(topic: any): Promise<any>;
  handleError(error: any): {
    error: boolean;
    message: string;
  };
}
export {};
