export interface AIResponse {
  content: string;
  metadata?: {
    confidence: number;
    source?: string;
  };
  error?: string;
}

export interface ProcessedData {
  id: string;
  timestamp: number;
  input: string;
  output: AIResponse;
  status: 'success' | 'error' | 'pending';
}