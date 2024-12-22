import { db } from '@db';
import { courses, enrollments, learningPathCourses, learningPaths, users } from '@db/schema';
import { and, desc, eq, sql } from 'drizzle-orm';

interface RecommendationFactors {
  userId: number;
  learningStyle: string;
  preferredTopics: string[];
  availableTimeMinutes: number;
  currentLevel: number;
  completedCourseIds: number[];
}

export async function generatePersonalizedPath(
  userId: number,
): Promise<typeof learningPaths.$inferSelect> {
  // Get user data and preferences
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Get user's completed courses
  const completedEnrollments = await db.query.enrollments.findMany({
    where: and(eq(enrollments.userId, userId), eq(enrollments.completed, true)),
  });

  const completedCourseIds = completedEnrollments.map((e) => e.courseId);

  const factors: RecommendationFactors = {
    userId: user.id,
    learningStyle: user.learningStyle ?? 'visual',
    preferredTopics: user.preferredTopics ? JSON.parse(user.preferredTopics) : [],
    availableTimeMinutes: user.preferredStudyTime ?? 60,
    currentLevel: user.level ?? 1,
    completedCourseIds,
  };

  // Get suitable courses based on user's level and preferences
  const recommendedCourses = await findRecommendedCourses(factors);

  // Create a new learning path
  const [learningPath] = await db
    .insert(learningPaths)
    .values({
      userId,
      name: `Personalized Path - ${new Date().toLocaleDateString()}`,
      description: 'Automatically generated based on your progress and preferences',
      difficulty:
        (user.level ?? 1) <= 2 ? 'beginner' : (user.level ?? 1) <= 4 ? 'intermediate' : 'advanced',
      estimatedCompletionTime: recommendedCourses.reduce(
        (sum, course) => sum + course.estimatedHours * 60,
        0,
      ),
    })
    .returning();

  // Add courses to the learning path
  await db.insert(learningPathCourses).values(
    recommendedCourses.map((course, index) => ({
      learningPathId: learningPath.id,
      courseId: course.id,
      order: index + 1,
      isRequired: true,
    })),
  );

  return learningPath;
}

async function findRecommendedCourses(factors: RecommendationFactors) {
  // Get courses that match user's level and haven't been completed
  const availableCourses = await db.query.courses.findMany({
    where: sql`${courses.id} NOT IN (${factors.completedCourseIds.join(', ')})`,
  });

  // Enhanced scoring system with additional factors
  const scoredCourses = availableCourses.map((course) => {
    try {
      const topics = Array.isArray(course.topics)
        ? course.topics
        : JSON.parse(course.topics || '[]');

      // Topic preference score (0-10)
      const topicMatchScore =
        factors.preferredTopics.filter((topic) => topics.includes(topic)).length * 2;

      // Time fit score (0-10, lower is better)
      const timeMatchScore =
        10 -
        Math.min(
          10,
          Math.abs(factors.availableTimeMinutes - (course.estimatedHours || 1) * 60) / 30,
        );

      // Enhanced difficulty matching (0-10)
      const difficultyMap = { beginner: 1, intermediate: 2, advanced: 3 };
      const userDifficultyLevel = Math.ceil(factors.currentLevel / 2);
      const courseDifficultyLevel =
        difficultyMap[course.difficulty as keyof typeof difficultyMap] || 2;

      // Adaptive difficulty - slightly challenge the user
      const preferredDifficulty = Math.min(3, userDifficultyLevel + 0.5);
      const difficultyScore = 10 - Math.abs(preferredDifficulty - courseDifficultyLevel) * 3;

      // Learning pace adjustment
      const learningPaceScore =
        factors.completedCourseIds.length > 0
          ? Math.min(10, (factors.completedCourseIds.length / 5) * 10)
          : 5;

      // Progressive learning score - favor courses that build on completed ones
      const prerequisites = Array.isArray(course.prerequisites)
        ? course.prerequisites
        : JSON.parse(course.prerequisites || '[]');
      const progressiveScore = prerequisites.some((p: number) =>
        factors.completedCourseIds.includes(p),
      )
        ? 10
        : 0;

      // Weighted scoring (total max: 100)
      const totalScore =
        topicMatchScore * 2 + // Max 20: Topic relevance
        timeMatchScore * 1.5 + // Max 15: Time fit
        difficultyScore * 2.5 + // Max 25: Adaptive difficulty
        learningPaceScore * 1 + // Max 10: Learning pace
        progressiveScore * 3; // Max 30: Progressive learning

      return {
        ...course,
        score: totalScore,
        matchDetails: {
          topicMatch: Math.round(topicMatchScore / 2), // Normalize to 0-10
          timeMatch: Math.round(timeMatchScore),
          difficultyMatch: Math.round(difficultyScore),
          learningPace: Math.round(learningPaceScore),
          progressive: Math.round(progressiveScore / 3), // Normalize to 0-10
        },
      };
    } catch (error) {
      console.error(`Error scoring course ${course.id}:`, error);
      return {
        ...course,
        score: 0,
        matchDetails: {
          topicMatch: 0,
          timeMatch: 0,
          difficultyMatch: 0,
          learningPace: 0,
          progressive: 0,
        },
      };
    }
  });

  // Sort by score and return top recommendations with scoring details
  const recommendedCourses = scoredCourses
    .sort((a, b) => b.score - a.score)
    .slice(0, 5) // Recommend top 5 courses
    .map(({ score, matchDetails, ...course }) => ({
      ...course,
      recommendationScore: score,
      matchDetails,
      difficultyLevel: course.difficulty,
      estimatedTimeToComplete: course.estimatedHours * 60, // in minutes
    }));

  console.log('Generated recommendations:', {
    userId: factors.userId,
    totalCandidates: availableCourses.length,
    recommendationsCount: recommendedCourses.length,
    topScore: recommendedCourses[0]?.recommendationScore,
  });

  return recommendedCourses;
}
