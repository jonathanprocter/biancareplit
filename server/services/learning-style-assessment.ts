import Anthropic from '@anthropic-ai/sdk';
import { db } from '@db';
import { learningStyleQuestions, learningStyleResponses, learningStyleResults } from '@db/schema';
import { desc, eq } from 'drizzle-orm';

// the newest Anthropic model is "claude-3-5-sonnet-20241022" which was released October 22, 2024
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function getQuizQuestions() {
  return await db.query.learningStyleQuestions.findMany({
    orderBy: desc(learningStyleQuestions.id),
  });
}

export async function submitQuizResponses(
  userId: number,
  responses: { questionId: number; response: number }[],
) {
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

  // Analyze responses with Claude
  const analysis = await analyzeResponses(questionsWithResponses);

  // Calculate scores
  const scores = calculateScores(questionsWithResponses);
  const dominantStyle = getDominantStyle(scores);

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
}

async function analyzeResponses(responses: any[]) {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `Analyze these learning style quiz responses and provide personalized learning recommendations:
        ${JSON.stringify(responses, null, 2)}
        
        Provide the analysis in this JSON format:
        {
          "learningStyleAnalysis": string, // Brief analysis of their learning style preferences
          "recommendations": string[], // List of 3-5 specific learning strategies
          "strengths": string[], // List of 2-3 learning strengths
          "areasForImprovement": string[] // List of 2-3 areas that could be improved
        }`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Anthropic API');
    }
    return JSON.parse(content.text);
  } catch (error) {
    console.error('Error analyzing responses:', error);
    return {
      learningStyleAnalysis: 'Unable to generate AI analysis at this time.',
      recommendations: ['Focus on varied learning materials', 'Try different study methods'],
      strengths: ['Self-awareness in taking this assessment'],
      areasForImprovement: ['Consider exploring multiple learning approaches'],
    };
  }
}

function calculateScores(responses: any[]) {
  const scores = {
    visual: 0,
    auditory: 0,
    kinesthetic: 0,
    readingWriting: 0,
  };

  responses.forEach((response) => {
    const score = response.response;
    switch (response.category) {
      case 'visual':
        scores.visual += score;
        break;
      case 'auditory':
        scores.auditory += score;
        break;
      case 'kinesthetic':
        scores.kinesthetic += score;
        break;
      case 'reading/writing':
        scores.readingWriting += score;
        break;
    }
  });

  return scores;
}

function getDominantStyle(scores: Record<string, number>) {
  return Object.entries(scores).reduce((a, b) => (a[1] > b[1] ? a : b))[0];
}
