import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// Base tables
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').unique().notNull(),
  password: text('password').notNull(),
  email: text('email').unique().notNull(),
  role: text('role').default('student').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  totalPoints: integer('total_points').default(0),
  level: integer('level').default(1),
  streakCount: integer('streak_count').default(0),
  lastActive: timestamp('last_active').defaultNow().notNull(),
  learningStyle: text('learning_style'),
  preferredStudyTime: integer('preferred_study_time').default(30),
  preferredTopics: text('preferred_topics').default('[]'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Learning style assessment tables
export const learningStyleQuestions = pgTable('learning_style_questions', {
  id: serial('id').primaryKey(),
  question: text('question').notNull(),
  category: text('category').notNull(), // visual, auditory, kinesthetic, reading/writing
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const learningStyleResponses = pgTable('learning_style_responses', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  questionId: integer('question_id')
    .references(() => learningStyleQuestions.id, { onDelete: 'cascade' })
    .notNull(),
  response: integer('response').notNull(), // Scale of 1-5
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const learningStyleResults = pgTable('learning_style_results', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  visualScore: integer('visual_score').notNull(),
  auditoryScore: integer('auditory_score').notNull(),
  kinestheticScore: integer('kinesthetic_score').notNull(),
  readingWritingScore: integer('reading_writing_score').notNull(),
  dominantStyle: text('dominant_style').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Add learning style relations
export const learningStyleQuestionRelations = relations(learningStyleQuestions, ({ many }) => ({
  responses: many(learningStyleResponses),
}));

export const learningStyleResponseRelations = relations(learningStyleResponses, ({ one }) => ({
  user: one(users, {
    fields: [learningStyleResponses.userId],
    references: [users.id],
  }),
  question: one(learningStyleQuestions, {
    fields: [learningStyleResponses.questionId],
    references: [learningStyleQuestions.id],
  }),
}));

export const learningStyleResultRelations = relations(learningStyleResults, ({ one }) => ({
  user: one(users, {
    fields: [learningStyleResults.userId],
    references: [users.id],
  }),
}));
export const courses = pgTable('courses', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  instructorId: integer('instructor_id')
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  difficulty: text('difficulty').default('intermediate').notNull(),
  prerequisites: text('prerequisites').default('[]').notNull(),
  topics: text('topics').default('[]').notNull(),
  estimatedHours: integer('estimated_hours').default(10).notNull(),
});

export const modules = pgTable('modules', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  courseId: integer('course_id')
    .references(() => courses.id)
    .notNull(),
  order: integer('order').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const enrollments = pgTable('enrollments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  courseId: integer('course_id')
    .references(() => courses.id)
    .notNull(),
  enrolledAt: timestamp('enrolled_at').defaultNow(),
  completed: boolean('completed').default(false),
  points: integer('points').default(0),
  correctAnswers: integer('correct_answers').default(0),
  totalAttempts: integer('total_attempts').default(0),
  timeSpent: integer('time_spent').default(0),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const badges = pgTable('badges', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  imageUrl: text('image_url').notNull(),
  requiredPoints: integer('required_points').notNull(),
  category: text('category').notNull(),
  tier: text('tier').default('bronze').notNull(), // bronze, silver, gold, platinum
  unlockCondition: text('unlock_condition').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Learning paths and recommendations
export const learningPaths = pgTable('learning_paths', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  difficulty: text('difficulty').default('intermediate').notNull(),
  estimatedCompletionTime: integer('estimated_completion_time').notNull(), // in minutes
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const learningPathCourses = pgTable('learning_path_courses', {
  id: serial('id').primaryKey(),
  learningPathId: integer('learning_path_id')
    .references(() => learningPaths.id)
    .notNull(),
  courseId: integer('course_id')
    .references(() => courses.id)
    .notNull(),
  order: integer('order').notNull(),
  isRequired: boolean('is_required').default(true).notNull(),
});

export const userPreferences = pgTable('user_preferences', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  key: text('key').notNull(),
  value: text('value').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// NCLEX Questions and Categories
export const nclexQuestions = pgTable('nclex_questions', {
  id: serial('id').primaryKey(),
  question: text('question').notNull(),
  options: text('options').notNull(), // JSON array of options
  correctAnswer: integer('correct_answer').notNull(),
  explanation: text('explanation').notNull(),
  category: text('category').notNull(),
  subcategory: text('subcategory').notNull(),
  difficulty: text('difficulty').notNull(),
  topic: text('topic').notNull(),
  rationale: text('rationale').notNull(), // Detailed explanation
  commonMistakes: text('common_mistakes').default('[]'), // JSON array
  relatedConcepts: text('related_concepts').default('[]'), // JSON array
  createdAt: timestamp('created_at').defaultNow().notNull(),
  isAIGenerated: boolean('is_ai_generated').default(false),
});

export const flashcards = pgTable('flashcards', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  front: text('front').notNull(),
  back: text('back').notNull(),
  difficulty: text('difficulty').notNull(),
  category: text('category').notNull(),
  subcategory: text('subcategory').notNull(),
  mainTopic: text('main_topic').notNull(),
  reviewCount: integer('review_count').default(0),
  lastReviewed: timestamp('last_reviewed'),
  nextReview: timestamp('next_review'),
  confidence: integer('confidence').default(0),
  createdFrom: text('created_from'), // 'missed_question', 'ai_generated', 'manual'
  relatedQuestionId: integer('related_question_id').references(() => nclexQuestions.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const quizAttempts = pgTable('quiz_attempts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  questionId: integer('question_id')
    .references(() => nclexQuestions.id)
    .notNull(),
  selectedAnswer: integer('selected_answer').notNull(),
  isCorrect: boolean('is_correct').notNull(),
  timeTaken: integer('time_taken').notNull(), // in seconds
  confidence: integer('confidence'), // 1-5 scale
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const dailyProgress = pgTable('daily_progress', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  date: timestamp('date').defaultNow().notNull(),
  questionsAttempted: integer('questions_attempted').default(0),
  correctAnswers: integer('correct_answers').default(0),
  flashcardsReviewed: integer('flashcards_reviewed').default(0),
  timeSpent: integer('time_spent').default(0), // in minutes
  topicsStudied: text('topics_studied').default('[]'), // JSON array
  strengthAreas: text('strength_areas').default('[]'), // JSON array
  weakAreas: text('weak_areas').default('[]'), // JSON array
});

export const instructorPreferences = pgTable('instructor_preferences', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  emailReports: boolean('email_reports').default(true),
  emailFrequency: text('email_frequency').default('daily'),
  reportPreferences: text('report_preferences').default('{}'), // JSON object
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Add relations
export const learningPathRelations = relations(learningPaths, ({ one, many }) => ({
  user: one(users, {
    fields: [learningPaths.userId],
    references: [users.id],
  }),
  courses: many(learningPathCourses),
}));

export const learningPathCourseRelations = relations(learningPathCourses, ({ one }) => ({
  learningPath: one(learningPaths, {
    fields: [learningPathCourses.learningPathId],
    references: [learningPaths.id],
  }),
  course: one(courses, {
    fields: [learningPathCourses.courseId],
    references: [courses.id],
  }),
}));

export const userPreferenceRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id],
  }),
}));
export const userBadges = pgTable('user_badges', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  badgeId: integer('badge_id')
    .references(() => badges.id)
    .notNull(),
  earnedAt: timestamp('earned_at').defaultNow(),
});

// Relations
export const courseRelations = relations(courses, ({ one, many }) => ({
  instructor: one(users, {
    fields: [courses.instructorId],
    references: [users.id],
  }),
  modules: many(modules),
  enrollments: many(enrollments),
}));

export const userRelations = relations(users, ({ many }) => ({
  enrollments: many(enrollments),
  teachingCourses: many(courses),
  userBadges: many(userBadges),
}));

export const moduleRelations = relations(modules, ({ one }) => ({
  course: one(courses, {
    fields: [modules.courseId],
    references: [courses.id],
  }),
}));

export const enrollmentRelations = relations(enrollments, ({ one }) => ({
  user: one(users, {
    fields: [enrollments.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [enrollments.courseId],
    references: [courses.id],
  }),
}));

export const badgeRelations = relations(badges, ({ many }) => ({
  userBadges: many(userBadges),
}));

export const userBadgeRelations = relations(userBadges, ({ one }) => ({
  user: one(users, {
    fields: [userBadges.userId],
    references: [users.id],
  }),
  badge: one(badges, {
    fields: [userBadges.badgeId],
    references: [badges.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users);
export const extendedInsertUserSchema = insertUserSchema.extend({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  email: z.string().email('Invalid email format'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
});
export const selectUserSchema = createSelectSchema(users);

export const insertCourseSchema = createInsertSchema(courses);
export const selectCourseSchema = createSelectSchema(courses);

export const insertBadgeSchema = createInsertSchema(badges);
export const selectBadgeSchema = createSelectSchema(badges);

// Types
export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
export type InsertCourse = typeof courses.$inferInsert;
export type SelectCourse = typeof courses.$inferSelect;
export type InsertBadge = typeof badges.$inferInsert;
export type SelectBadge = typeof badges.$inferSelect;

// Add relations for new tables
export const nclexQuestionRelations = relations(nclexQuestions, ({ many }) => ({
  attempts: many(quizAttempts),
  flashcards: many(flashcards),
}));

export const flashcardRelations = relations(flashcards, ({ one }) => ({
  user: one(users, {
    fields: [flashcards.userId],
    references: [users.id],
  }),
  relatedQuestion: one(nclexQuestions, {
    fields: [flashcards.relatedQuestionId],
    references: [nclexQuestions.id],
  }),
}));

export const quizAttemptRelations = relations(quizAttempts, ({ one }) => ({
  user: one(users, {
    fields: [quizAttempts.userId],
    references: [users.id],
  }),
  question: one(nclexQuestions, {
    fields: [quizAttempts.questionId],
    references: [nclexQuestions.id],
  }),
}));

export const dailyProgressRelations = relations(dailyProgress, ({ one }) => ({
  user: one(users, {
    fields: [dailyProgress.userId],
    references: [users.id],
  }),
}));

export const instructorPreferenceRelations = relations(instructorPreferences, ({ one }) => ({
  user: one(users, {
    fields: [instructorPreferences.userId],
    references: [users.id],
  }),
}));

// Add schemas for new tables
export const insertNclexQuestionSchema = createInsertSchema(nclexQuestions);
export const selectNclexQuestionSchema = createSelectSchema(nclexQuestions);

export const insertFlashcardSchema = createInsertSchema(flashcards);
export const selectFlashcardSchema = createSelectSchema(flashcards);

export const insertQuizAttemptSchema = createInsertSchema(quizAttempts);
export const selectQuizAttemptSchema = createSelectSchema(quizAttempts);

export const insertDailyProgressSchema = createInsertSchema(dailyProgress);
export const selectDailyProgressSchema = createSelectSchema(dailyProgress);

export const insertInstructorPreferenceSchema = createInsertSchema(instructorPreferences);
export const selectInstructorPreferenceSchema = createSelectSchema(instructorPreferences);

// Types for new tables
export type InsertNclexQuestion = typeof nclexQuestions.$inferInsert;
export type SelectNclexQuestion = typeof nclexQuestions.$inferSelect;
export type InsertFlashcard = typeof flashcards.$inferInsert;
export type SelectFlashcard = typeof flashcards.$inferSelect;
export type InsertQuizAttempt = typeof quizAttempts.$inferInsert;
export type SelectQuizAttempt = typeof quizAttempts.$inferSelect;
export type InsertDailyProgress = typeof dailyProgress.$inferInsert;
export type SelectDailyProgress = typeof dailyProgress.$inferSelect;
export type InsertInstructorPreference = typeof instructorPreferences.$inferInsert;
export type SelectInstructorPreference = typeof instructorPreferences.$inferSelect;
