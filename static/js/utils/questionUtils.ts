import type { NCLEXQuestion, NCLEXQuestionData } from '../types/nclex';

export function createBaseQuestion(data: NCLEXQuestionData): NCLEXQuestion {
  return {
    ...data,
    validated: false,
    rationale: data.rationale || { keyPoints: [] },
    relatedConcepts: data.relatedConcepts || [],
    topic: data.topic || 'General',
    subcategory: data.subcategory || data.category,
  };
}

export function validateQuestion(question: NCLEXQuestion): boolean {
  return (
    typeof question.id === 'string' &&
    typeof question.question === 'string' &&
    Array.isArray(question.options) &&
    typeof question.correctAnswer === 'number' &&
    question.correctAnswer >= 0 &&
    question.correctAnswer < question.options.length &&
    typeof question.category === 'string' &&
    typeof question.subcategory === 'string' &&
    typeof question.difficulty === 'string'
  );
}
