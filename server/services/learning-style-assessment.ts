import { db } from '@db';
import { learningStyleQuestions, learningStyleResponses, learningStyleResults } from '@db/schema';
import { desc, eq } from 'drizzle-orm';

// Initialize Anthropic client settings
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.warn('Warning: ANTHROPIC_API_KEY not set. AI-powered analysis will be limited.');
}

export async function getQuizQuestions() {
  return await db.query.learningStyleQuestions.findMany({
    orderBy: desc(learningStyleQuestions.id),
  });
}

async function generateAIAnalysis(questionsWithResponses: any[]) {
  if (!ANTHROPIC_API_KEY) {
    return {
      learningStyleAnalysis: 'AI analysis not available - Anthropic API key not configured',
      recommendations: ['Configure AI analysis for personalized recommendations'],
      strengths: ['Self-assessment completion'],
      areasForImprovement: ['Enable AI-powered analysis for detailed insights'],
    };
  }

  // TODO: Implement actual Anthropic API integration
  const analysis = {
    learningStyleAnalysis: 'Detailed AI analysis will be provided when integration is complete',
    recommendations: ['Focus on varied learning materials', 'Try different study methods'],
    strengths: ['Self-awareness in taking this assessment'],
    areasForImprovement: ['Consider exploring multiple learning approaches'],
  };

  return analysis;
}

export async function submitQuizResponses(
  userId: number,
  responses: { questionId: number; response: number }[],
) {
  try {
    // Save responses
    await db.insert(learningStyleResponses).values(
      responses.map((r) => ({
        userId,
        questionId: r.questionId,
        response: r.response,
      })),
    );

    // Get questions with responses
    const questionsWithResponses = await Promise.all(
      responses.map(async (r) => {
        const question = await db.query.learningStyleQuestions.findFirst({
          where: eq(learningStyleQuestions.id, r.questionId),
        });
        return {
          ...question,
          response: r.response,
        };
      }),
    );

    // Calculate scores based on responses
    const scores = calculateScores(questionsWithResponses);
    const dominantStyle = getDominantStyle(scores);

    // Get AI-powered analysis
    const analysis = await generateAIAnalysis(questionsWithResponses);

    // Save results
    const [result] = await db
      .insert(learningStyleResults)
      .values({
        userId,
        visualScore: scores.visual,
        auditoryScore: scores.auditory,
        kinestheticScore: scores.kinesthetic,
        readingWritingScore: scores.readingWriting,
        dominantStyle,
      })
      .returning();

    return {
      scores,
      dominantStyle,
      analysis,
      resultId: result.id,
    };
  } catch (error) {
    console.error('Error in submitQuizResponses:', error);
    throw new Error('Failed to process quiz responses');
  }
}

interface QuizResponse {
  question?: {
    id: number;
    question: string;
    category: string;
  };
  response: number;
}

interface LearningScores {
  visual: number;
  auditory: number;
  kinesthetic: number;
  readingWriting: number;
}

function calculateScores(responses: QuizResponse[]): LearningScores {
  const scores: LearningScores = {
    visual: 0,
    auditory: 0,
    kinesthetic: 0,
    readingWriting: 0,
  };

  responses.forEach((response) => {
    const score = response.response;
    const category = response.question?.category?.toLowerCase() || '';

    if (category.includes('visual')) {
      scores.visual += score;
    } else if (category.includes('auditory')) {
      scores.auditory += score;
    } else if (category.includes('kinesthetic')) {
      scores.kinesthetic += score;
    } else if (category.includes('reading') || category.includes('writing')) {
      scores.readingWriting += score;
    }
  });

  return scores;
}

function getDominantStyle(scores: Record<string, number>): string {
  return Object.entries(scores).reduce((a, b) => (a[1] > b[1] ? a : b))[0];
}
