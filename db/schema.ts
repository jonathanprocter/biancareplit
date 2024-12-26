import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

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
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const courses = pgTable('courses', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  instructorId: integer('instructor_id')
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  difficulty: text('difficulty').default('intermediate').notNull(),
});

export const nclexQuestions = pgTable('nclex_questions', {
  id: serial('id').primaryKey(),
  question: text('question').notNull(),
  options: text('options').notNull(),
  correctAnswer: integer('correct_answer').notNull(),
  explanation: text('explanation').notNull(),
  category: text('category').notNull(),
  difficulty: text('difficulty').notNull(),
  topic: text('topic').notNull(),
  rationale: text('rationale').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Add relations
export const courseRelations = relations(courses, ({ one }) => ({
  instructor: one(users, {
    fields: [courses.instructorId],
    references: [users.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export const insertCourseSchema = createInsertSchema(courses);
export const selectCourseSchema = createSelectSchema(courses);

export const insertNclexQuestionSchema = createInsertSchema(nclexQuestions);
export const selectNclexQuestionSchema = createSelectSchema(nclexQuestions);

// Types
export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
export type InsertCourse = typeof courses.$inferInsert;
export type SelectCourse = typeof courses.$inferSelect;
export type InsertNclexQuestion = typeof nclexQuestions.$inferInsert;
export type SelectNclexQuestion = typeof nclexQuestions.$inferSelect;
