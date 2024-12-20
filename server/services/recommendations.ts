import { db } from '@db';
import { users, courses, enrollments, learningPaths, learningPathCourses } from '@db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';

interface RecommendationFactors {
  learningStyle: string;
  preferredTopics: string[];
  availableTimeMinutes: number;
  currentLevel: number;
  completedCourseIds: number[];
}

export async function generatePersonalizedPath(
  userId: number
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
    learningStyle: user.learningStyle,
    preferredTopics: JSON.parse(user.preferredTopics),
    availableTimeMinutes: user.preferredStudyTime,
    currentLevel: user.level,
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
      difficulty: user.level <= 2 ? 'beginner' : user.level <= 4 ? 'intermediate' : 'advanced',
      estimatedCompletionTime: recommendedCourses.reduce(
        (sum, course) => sum + course.estimatedHours * 60,
        0
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
    }))
  );

  return learningPath;
}

async function findRecommendedCourses(factors: RecommendationFactors) {
  // Get courses that match user's level and haven't been completed
  const availableCourses = await db.query.courses.findMany({
    where: sql`${courses.id} NOT IN (${factors.completedCourseIds.join(', ')})`,
  });

  // Score and sort courses based on various factors
  const scoredCourses = availableCourses.map((course) => {
    const topics = JSON.parse(course.topics);
    const topicMatchScore = factors.preferredTopics.filter((topic) =>
      topics.includes(topic)
    ).length;

    // Calculate time fit score
    const timeMatchScore = Math.abs(factors.availableTimeMinutes - course.estimatedHours * 60);

    // Calculate difficulty match score
    const difficultyMap = { beginner: 1, intermediate: 2, advanced: 3 };
    const courseDifficultyScore = Math.abs(
      difficultyMap[course.difficulty as keyof typeof difficultyMap] -
        Math.ceil(factors.currentLevel / 2)
    );

    // Combine scores (lower is better for time and difficulty)
    const totalScore = topicMatchScore * 2 - timeMatchScore / 100 - courseDifficultyScore * 1.5;

    return {
      ...course,
      score: totalScore,
    };
  });

  // Sort by score and return top recommendations
  return scoredCourses
    .sort((a, b) => b.score - a.score)
    .slice(0, 5) // Recommend top 5 courses
    .map(({ score, ...course }) => course);
}
