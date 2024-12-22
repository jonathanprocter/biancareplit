import { z } from 'zod';

// Define the shape of medical data
const medicalDataSchema = z.object({
  question: z.string(),
  answer: z.string(),
  category: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export function sanitizeMedicalData<T extends Record<string, unknown>>(data: T): T {
  // Remove any potentially sensitive information
  const sanitized = { ...data };

  // Remove specific fields that might contain PII
  const sensitiveFields = ['ssn', 'dob', 'address', 'phone', 'email'];
  sensitiveFields.forEach((field) => {
    delete sanitized[field];
  });

  // Validate the sanitized data
  try {
    medicalDataSchema.parse(sanitized);
  } catch (error) {
    console.warn('Data validation failed:', error);
  }

  return sanitized;
}
