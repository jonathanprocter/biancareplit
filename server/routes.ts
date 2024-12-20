import type { Express, Request, Response } from 'express';
import { createServer, type Server } from 'http';
import { db } from '../db/index.js';
import {
  users,
  courses,
  modules,
  enrollments,
  badges,
  userBadges,
  extendedInsertUserSchema,
  learningPaths,
  learningPathCourses,
  learningStyleQuestions,
} from '../db/schema.js';
import { submitQuizResponses } from './services/learning-style-assessment';
import { eq, and, lte, sql, desc, asc } from 'drizzle-orm';
import { generatePersonalizedPath } from './services/recommendations';
import { hash, compare } from 'bcrypt';
import session from 'express-session';
import MemoryStore from 'memorystore';
import path from 'path';
import fs from 'fs';
// Extend express-session types
declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

export function registerRoutes(app: Express): Server {
  // Create HTTP server
  const httpServer = createServer(app);

  // Register routes below
  // prefix all routes with /api
  const memoryStore = MemoryStore(session);

  app.use(
    session({
      secret: process.env.FLASK_SECRET_KEY || 'development_secret',
      resave: false,
      saveUninitialized: false,
      store: new memoryStore({
        checkPeriod: 86400000,
      }),
    }),
  );

  // Authentication middleware
  const requireAuth = (req: Request, res: Response, next: (error?: any) => void) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    next();
  };

  // Auth routes
  app.post('/api/register', async (req, res) => {
    console.log('[API] Registration attempt:', req.body.username);
    try {
      const userData = extendedInsertUserSchema.parse(req.body);

      // Check if username or email already exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.username, userData.username),
      });
      const existingEmail = await db.query.users.findFirst({
        where: eq(users.email, userData.email),
      });

      if (existingUser) {
        console.log('[API] Registration failed: Username taken -', userData.username);
        return res.status(400).json({ message: 'Username already taken' });
      }
      if (existingEmail) {
        console.log('[API] Registration failed: Email exists -', userData.email);
        return res.status(400).json({ message: 'Email already registered' });
      }

      // Hash password
      const hashedPassword = await hash(userData.password, 10);

      // Create user
      const [user] = await db
        .insert(users)
        .values({
          ...userData,
          password: hashedPassword,
          role: 'student', // Default role
          totalPoints: 0,
          level: 1,
          streakCount: 0,
        })
        .returning({
          id: users.id,
          username: users.username,
          role: users.role,
        });

      // Auto login after registration
      req.session.userId = user.id;
      console.log('[API] Registration successful:', user.username);
      res.status(201).json(user);
    } catch (error: any) {
      console.error('[API] Registration error:', error);
      if (error?.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: 'Failed to create account' });
    }
  });

  app.post('/api/login', async (req, res) => {
    console.log('[API] Login attempt for username:', req.body.username);
    const { username, password } = req.body;
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.username, username),
      });

      if (!user) {
        console.log('[API] Login failed: User not found -', username);
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const isValidPassword = await compare(password, user.password);
      if (!isValidPassword) {
        console.log('[API] Login failed: Invalid password -', username);
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      req.session.userId = user.id;
      console.log('[API] Login successful:', username);
      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
      });
    } catch (error) {
      console.error('[API] Login error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Course routes
  app.get('/api/courses', requireAuth, async (req, res) => {
    try {
      const allCourses = await db.query.courses.findMany({
        with: {
          instructor: true,
          modules: true,
        },
      });
      res.json(allCourses);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch courses' });
    }
  });

  app.get('/api/courses/:id', requireAuth, async (req, res) => {
    try {
      const course = await db.query.courses.findFirst({
        where: eq(courses.id, parseInt(req.params.id)),
        with: {
          instructor: true,
          modules: true,
        },
      });

      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      res.json(course);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch course' });
    }
  });

  // Enrollment routes
  app.post('/api/enrollments', requireAuth, async (req, res) => {
    const { courseId } = req.body;
    const userId = req.session.userId;

    try {
      const existing = await db.query.enrollments.findFirst({
        where: and(
          eq(enrollments.userId, Number(userId)),
          eq(enrollments.courseId, Number(courseId)),
        ),
      });

      if (existing) {
        return res.status(400).json({ message: 'Already enrolled' });
      }

      const [enrollment] = await db
        .insert(enrollments)
        .values({
          userId: Number(userId),
          courseId: Number(courseId),
          completed: false,
          points: 0,
          correctAnswers: 0,
          totalAttempts: 0,
        })
        .returning();

      if (!enrollment) {
        throw new Error('Failed to create enrollment');
      }

      res.json(enrollment);
    } catch (error) {
      res.status(500).json({ message: 'Failed to enroll' });
    }
  });

  // Gamification routes
  app.get('/api/users/:userId/progress', requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      // Get user's enrollments with progress
      const userEnrollments = await db.query.enrollments.findMany({
        where: eq(enrollments.userId, userId),
        with: {
          course: true,
        },
      });

      // Get user's badges
      const earnedBadges = await db.query.userBadges.findMany({
        where: eq(userBadges.userId, userId),
        with: {
          badge: true,
        },
      });

      // Calculate total points and progress
      const totalPoints = userEnrollments.reduce(
        (sum, enrollment) => sum + (enrollment.points || 0),
        0,
      );
      const accuracy =
        userEnrollments.reduce((sum, enrollment) => {
          if (!enrollment.totalAttempts) return sum;
          return sum + (enrollment.correctAnswers || 0) / enrollment.totalAttempts;
        }, 0) / Math.max(userEnrollments.length, 1);

      res.json({
        totalPoints,
        accuracy: Math.round(accuracy * 100),
        enrollments: userEnrollments,
        badges: earnedBadges.map((ub) => ({
          ...ub.badge,
          earnedAt: ub.earnedAt,
        })),
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch user progress' });
    }
  });

  app.post('/api/users/:userId/progress', requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { enrollmentId, correct } = req.body;

      // Update enrollment progress
      const [enrollment] = await db
        .update(enrollments)
        .set({
          points: sql`COALESCE(${enrollments.points}, 0) + ${correct ? 10 : 0}`,
          correctAnswers: sql`COALESCE(${enrollments.correctAnswers}, 0) + ${correct ? 1 : 0}`,
          totalAttempts: sql`COALESCE(${enrollments.totalAttempts}, 0) + 1`,
        })
        .where(eq(enrollments.id, enrollmentId))
        .returning();

      if (!enrollment) {
        throw new Error('Failed to update enrollment');
      }

      // Check for badge eligibility
      const availableBadges = await db.query.badges.findMany({
        where: eq(badges.requiredPoints, sql`${enrollment.points}`),
      });

      const existingBadges = await db.query.userBadges.findMany({
        where: eq(userBadges.userId, userId),
      });

      const newBadges = availableBadges.filter(
        (badge) => !existingBadges.some((ub) => ub.badgeId === badge.id),
      );

      if (newBadges.length > 0) {
        await db.insert(userBadges).values(
          newBadges.map((badge) => ({
            userId,
            badgeId: badge.id,
          })),
        );
      }

      res.json({ enrollment, newBadges });
    } catch (error) {
      res.status(500).json({ message: 'Failed to update progress' });
    }
  });
  // Learning path routes
  app.post('/api/users/:userId/learning-paths', requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      if (isNaN(userId) || userId !== req.session.userId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      console.log('[API] Generating learning path for user:', userId);

      const learningPath = await generatePersonalizedPath(userId);

      if (!learningPath) {
        throw new Error('Failed to generate learning path');
      }

      const pathWithCourses = await db.query.learningPaths.findFirst({
        where: eq(learningPaths.id, learningPath.id),
        with: {
          courses: {
            with: {
              course: {
                with: {
                  instructor: true,
                },
              },
            },
          },
        },
      });

      if (!pathWithCourses) {
        throw new Error('Failed to fetch generated learning path');
      }

      console.log('[API] Successfully generated learning path:', pathWithCourses.id);
      res.json(pathWithCourses);
    } catch (error) {
      console.error('[API] Failed to generate learning path:', error);
      res.status(500).json({
        message: 'Failed to generate learning path',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.get('/api/users/:userId/learning-paths', requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      if (isNaN(userId) || userId !== req.session.userId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      console.log('[API] Fetching learning paths for user:', userId);

      const paths = await db.query.learningPaths.findMany({
        where: eq(learningPaths.userId, userId),
        with: {
          courses: {
            with: {
              course: {
                with: {
                  instructor: true,
                },
              },
            },
            orderBy: asc(learningPathCourses.order),
          },
        },
        orderBy: desc(learningPaths.createdAt),
      });

      console.log('[API] Found learning paths:', paths.length);
      res.json(paths);
    } catch (error) {
      console.error('[API] Failed to fetch learning paths:', error);
      res.status(500).json({
        message: 'Failed to fetch learning paths',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.put('/api/users/:userId/preferences', requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      if (userId !== req.session.userId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      const { learningStyle, preferredStudyTime, preferredTopics } = req.body;

      const [user] = await db
        .update(users)
        .set({
          learningStyle,
          preferredStudyTime,
          preferredTopics: JSON.stringify(preferredTopics),
        })
        .where(eq(users.id, userId))
        .returning();

      res.json(user);
    } catch (error) {
      console.error('[API] Failed to update preferences:', error);
      res.status(500).json({ message: 'Failed to update preferences' });
    }
  });

  // Learning Style Assessment Routes
  app.get('/api/learning-style/questions', requireAuth, async (req, res) => {
    try {
      const questions = await db.query.learningStyleQuestions.findMany({
        orderBy: desc(learningStyleQuestions.id),
      });
      res.json(questions);
    } catch (error) {
      console.error('[API] Failed to fetch learning style questions:', error);
      res.status(500).json({ message: 'Failed to fetch questions' });
    }
  });

  app.post('/api/learning-style/submit', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const responses = req.body.responses;

      if (!Array.isArray(responses) || responses.length === 0) {
        return res.status(400).json({ message: 'Invalid response format' });
      }

      const result = await submitQuizResponses(userId, responses);
      res.json(result);
    } catch (error) {
      console.error('[API] Failed to submit learning style responses:', error);
      res.status(500).json({ message: 'Failed to process quiz responses' });
    }
  });

  // Daily Progress API
  app.get('/api/daily-progress', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      console.log('[API] Fetching daily progress for user:', userId);

      // Get recent quiz attempts and study sessions
      const recentQuizzes = await db.query.enrollments.findMany({
        where: eq(enrollments.userId, Number(userId)),
        orderBy: desc(enrollments.updatedAt),
        limit: 10,
      });

      // Calculate performance metrics
      const pastPerformance = recentQuizzes.map(quiz => ({
        accuracy: quiz.correctAnswers / Math.max(quiz.totalAttempts, 1) * 100,
        date: quiz.updatedAt,
      }));

      // Calculate target performance (aim for 85% or 10% improvement)
      const currentPerformance = pastPerformance[0]?.accuracy || 0;
      const targetPerformance = Math.min(85, currentPerformance * 1.1);

      // Predict future performance using simple linear regression
      const predictedPerformance = pastPerformance.map((perf, index) => ({
        accuracy: currentPerformance + (index + 1) * ((targetPerformance - currentPerformance) / 10),
        date: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000),
      }));

      // Get strength and weak areas based on recent performance
      const [strengthAreas, weakAreas] = await Promise.all([
        db.query.enrollments.findMany({
          where: and(
            eq(enrollments.userId, Number(userId)),
            gte(sql`correctAnswers::float / NULLIF(totalAttempts, 0)`, 0.8),
          ),
          with: { course: true },
          limit: 3,
        }),
        db.query.enrollments.findMany({
          where: and(
            eq(enrollments.userId, Number(userId)),
            lt(sql`correctAnswers::float / NULLIF(totalAttempts, 0)`, 0.6),
          ),
          with: { course: true },
          limit: 3,
        }),
      ]);

      // Get current learning path
      const learningPath = await db.query.learningPaths.findFirst({
        where: eq(learningPaths.userId, Number(userId)),
        orderBy: desc(learningPaths.createdAt),
        with: {
          courses: {
            with: { course: true },
            orderBy: asc(learningPathCourses.order),
          },
        },
      });

      const response = {
        questionsAttempted: recentQuizzes.reduce((sum, q) => sum + q.totalAttempts, 0),
        correctAnswers: recentQuizzes.reduce((sum, q) => sum + q.correctAnswers, 0),
        flashcardsReviewed: recentQuizzes.length,
        timeSpent: recentQuizzes.reduce((sum, q) => sum + (q.timeSpent || 0), 0),
        strengthAreas: strengthAreas.map(e => e.course.name),
        weakAreas: weakAreas.map(e => e.course.name),
        trends: {
          pastPerformance: pastPerformance.map(p => p.accuracy),
          predictedPerformance: predictedPerformance.map(p => p.accuracy),
          targetPerformance,
          dates: [...pastPerformance.map(p => p.date), ...predictedPerformance.map(p => p.date)],
        },
        learningPath: learningPath ? {
          currentTopic: learningPath.courses[0]?.course.name || '',
          nextTopics: learningPath.courses.slice(1, 4).map(c => c.course.name),
          completionRate: (learningPath.completedCourses / learningPath.totalCourses) * 100,
          estimatedTimeToTarget: Math.ceil((targetPerformance - currentPerformance) / 2), // Assuming 2% improvement per day
        } : null,
      };

      res.json(response);
    } catch (error) {
      console.error('[API] Error fetching daily progress:', error);
      res.status(500).json({ message: 'Failed to fetch daily progress' });
    }
  });

  app.get('/health', async (req, res) => {
    try {
      await db.execute(sql`SELECT 1`);
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ status: 'unhealthy', error: errorMessage });
    }
  });

  // Content Upload and Processing Routes
  app.post('/api/content/upload', requireAuth, async (req, res) => {
    try {
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ message: 'No files were uploaded.' });
      }

      const file = req.files.file;
      const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];

      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({ message: 'Invalid file type. Only PDF, DOCX, and TXT files are allowed.' });
      }

      // Save file and process content
      const uploadDir = path.join(__dirname, '..', 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const fileName = `${Date.now()}-${file.name}`;
      const filePath = path.join(uploadDir, fileName);

      await file.mv(filePath);

      // Process the content using ContentParsingService
      const contentParser = new ContentParsingService();
      const content = await contentParser.parseFile(filePath);
      const analysis = await contentParser.analyzeContent(content);
      const result = await contentParser.integrateContent(JSON.parse(analysis));

      // Clean up the uploaded file
      fs.unlinkSync(filePath);

      res.json(result);
    } catch (error) {
      console.error('[API] Content upload error:', error);
      res.status(500).json({ 
        message: 'Failed to process uploaded content',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return httpServer;
}