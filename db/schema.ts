import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Base tables
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  email: text("email").unique().notNull(),
  role: text("role").default("student").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  totalPoints: integer("total_points").default(0).notNull(),
  level: integer("level").default(1).notNull(),
  streakCount: integer("streak_count").default(0).notNull(),
  lastActive: timestamp("last_active").defaultNow().notNull(),
});

export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  instructorId: integer("instructor_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const modules = pgTable("modules", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  courseId: integer("course_id").references(() => courses.id).notNull(),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const enrollments = pgTable("enrollments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  courseId: integer("course_id").references(() => courses.id).notNull(),
  enrolledAt: timestamp("enrolled_at").defaultNow(),
  completed: boolean("completed").default(false),
  points: integer("points").default(0),
  correctAnswers: integer("correct_answers").default(0),
  totalAttempts: integer("total_attempts").default(0),
});

export const badges = pgTable("badges", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  requiredPoints: integer("required_points").notNull(),
  category: text("category").notNull(),
  tier: text("tier").default("bronze").notNull(), // bronze, silver, gold, platinum
  unlockCondition: text("unlock_condition").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userBadges = pgTable("user_badges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  badgeId: integer("badge_id").references(() => badges.id).notNull(),
  earnedAt: timestamp("earned_at").defaultNow(),
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
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Invalid email format"),
  username: z.string().min(3, "Username must be at least 3 characters"),
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
