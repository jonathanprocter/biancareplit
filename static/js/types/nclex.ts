import { z } from 'zod';

// Define the base schema first
export const questionSchema = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(z.string()),
  correctAnswer: z.number(),
  explanation: z.string(),
  category: z.string(),
  subcategory: z.string(),
  difficulty: z.string(),
  topic: z.string(),
  rationale: z.object({
    keyPoints: z.array(z.string()),
  }),
  relatedConcepts: z.array(z.string()),
  validated: z.boolean().default(false),
});

// Define types based on the schema
export type NCLEXQuestion = z.infer<typeof questionSchema>;
export type NCLEXQuestionData = Omit<NCLEXQuestion, 'validated'>;

export const categoryDataSchema = z.object({
  subcategories: z.array(z.string()),
  questionCount: z.number(),
});

export const initialQuestionBankSchema = z.object({
  questions: z.array(questionSchema),
  categories: z.record(categoryDataSchema),
});

export interface CategoryData {
  subcategories: string[];
  questionCount: number;
}

export interface InitialQuestionBank {
  questions: NCLEXQuestionData[];
  categories: {
    [key: string]: CategoryData;
  };
}

export const middlewareConfigSchema = z.object({
  logging: z.object({
    level: z.enum(['DEBUG', 'INFO', 'WARNING', 'ERROR']),
    format: z.enum(['json', 'text']),
    request_tracking: z.boolean(),
    file_logging: z.boolean().optional(),
    log_path: z.string().optional(),
  }),
  metrics: z.object({
    enabled: z.boolean(),
    prefix: z.string(),
    path: z.string(),
    collection_interval: z.number().optional(),
    custom_metrics: z.array(z.string()).optional(),
  }),
  performance: z.object({
    enabled: z.boolean(),
    warning_threshold_ms: z.number(),
    critical_threshold_ms: z.number(),
    track_memory: z.boolean().optional(),
    track_cpu: z.boolean().optional(),
  }),
  request: z.object({
    timeout: z.number(),
    max_content_length: z.number(),
    cors_enabled: z.boolean(),
    rate_limit: z
      .object({
        enabled: z.boolean(),
        requests_per_minute: z.number(),
      })
      .optional(),
  }),
  analytics: z.object({
    enabled: z.boolean(),
    sampling_rate: z.number(),
    track_user_sessions: z.boolean().optional(),
    track_performance: z.boolean().optional(),
  }),
  security: z
    .object({
      csrf_protection: z.boolean(),
      xss_protection: z.boolean(),
      content_security_policy: z.boolean(),
    })
    .optional(),
});

export const questionBankConfigSchema = z.object({
  middleware: middlewareConfigSchema,
});

export type MiddlewareConfig = z.infer<typeof middlewareConfigSchema>;

export type QuestionBankConfig = z.infer<typeof questionBankConfigSchema>;
