import { compare, hash } from 'bcrypt';
import { lt } from 'drizzle-orm';
import { and, asc, desc, eq, gte, sql } from 'drizzle-orm';
import type { Express, NextFunction, Request, Response } from 'express';
import { type Server, createServer } from 'http';

import { db } from '../db/index.js';
import {
  badges,
  courses,
  enrollments,
  extendedInsertUserSchema,
  learningPathCourses,
  learningPaths,
  learningStyleQuestions,
  userBadges,
  users,
} from '../db/schema.js';
import { AIService } from './services/AIService';
import { submitQuizResponses } from './services/learning-style-assessment';
import { generatePersonalizedPath } from './services/recommendations';

interface ErrorResponse {
  message: string;
  details?: unknown;
  stack?: string;
  error?: string;
}

interface RequestError extends Error {
  status?: number;
  statusCode?: number;
  details?: unknown;
  code?: string;
}

// Extend express-session types
declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

export function registerRoutes(app: Express): Server {
  // Register routes below
  // prefix all routes with /api
  // Session is configured in index.ts

  // Authentication middleware
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    next();
  };

  // Error handling middleware
  const handleError = (err: RequestError, res: Response) => {
    console.error('[API] Error:', err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    const errorResponse: ErrorResponse = {
      message,
      ...(err.details && { details: err.details }),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    };
    console.error('[API] Sending error response:', errorResponse);
    res.status(status).json(errorResponse);
  };

  // AI routes
  // AI Service health check endpoint - public for monitoring
  app.get('/api/ai/health', async (req, res) => {
    try {
      const aiService = AIService.getInstance();
      const startTime = Date.now();
      
      await aiService.ensureConnection();
      
      res.json({ 
        status: 'healthy',
        message: 'AI Service connection validated successfully',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        environment: process.env.NODE_ENV || 'development'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(503).json({
        status: 'unhealthy',
        message: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  });

  app.post('/api/ai/questions/generate', requireAuth, async (req, res) => {
    try {
      const { topic, difficulty, count } = req.body;
      const aiService = AIService.getInstance();
      const questions = await aiService.generate_questions(topic, difficulty, count);
      res.json({ success: true, questions });
    } catch (error) {
      handleError(error, res);
    }
  });

  app.post('/api/ai/flashcards/generate', requireAuth, async (req, res) => {
    try {
      const { topic, count } = req.body;
      const aiService = AIService.getInstance();
      const flashcards = await aiService.generate_flashcards(topic, count);
      res.json({ success: true, flashcards });
    } catch (error) {
      handleError(error, res);
    }
  });

  app.post('/api/ai/progress/analyze', requireAuth, async (req, res) => {
    try {
      const aiService = AIService.getInstance();
      const analysis = await aiService.analyze_study_progress(req.body);
      res.json({ success: true, ...analysis });
    } catch (error) {
      handleError(error, res);
    }
  });
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
    } catch (error) {
      console.error('[API] Registration error:', error);
      if (error instanceof Error && error.name === 'ZodError') {
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[API] Error fetching courses:', errorMessage);
      res.status(500).json({ message: 'Failed to fetch courses', error: errorMessage });
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
      console.error('[API] Error fetching course:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        message: 'Failed to fetch course',
        error: errorMessage,
      });
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[API] Error enrolling in course:', errorMessage);
      res.status(500).json({ message: 'Failed to enroll', error: errorMessage });
    }
  });

  // Gamification routes
  app.get('/api/users/:userId/progress/achievements', requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      console.log('[API] Fetching achievements for user:', userId);

      // Get user details with expanded fields
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          totalPoints: true,
          level: true,
          streakCount: true,
          lastActive: true,
          preferredTopics: true,
        },
      });

      if (!user) {
        console.log('[API] User not found:', userId);
        return res.status(404).json({ message: 'User not found' });
      }

      console.log('[API] Found user:', { userId, level: user.level, points: user.totalPoints });

      // Get user's enrollments with progress
      const userEnrollments = await db.query.enrollments.findMany({
        where: eq(enrollments.userId, userId),
        with: {
          course: true,
        },
        orderBy: desc(enrollments.updatedAt),
        limit: 5,
      });

      console.log('[API] Retrieved enrollments:', userEnrollments.length);

      // Get user's badges
      const earnedBadges = await db.query.userBadges.findMany({
        where: eq(userBadges.userId, userId),
        with: {
          badge: true,
        },
      });

      console.log('[API] Retrieved earned badges:', earnedBadges.length);

      // Calculate accuracy from recent enrollments
      const accuracy =
        userEnrollments.reduce((sum, enrollment) => {
          if (!enrollment.totalAttempts) return sum;
          return sum + (enrollment.correctAnswers || 0) / enrollment.totalAttempts;
        }, 0) / Math.max(userEnrollments.length, 1);

      // Format recent achievements with more detailed information
      const recentAchievements = userEnrollments.map((enrollment) => ({
        topic: enrollment.course.title,
        score: Math.round(
          (enrollment.correctAnswers / Math.max(enrollment.totalAttempts, 1)) * 100,
        ),
        date: enrollment.updatedAt,
        timeSpent: enrollment.timeSpent || 0,
        progress: enrollment.completed
          ? 100
          : Math.round((enrollment.correctAnswers / Math.max(enrollment.totalAttempts, 1)) * 100),
      }));

      // Get all available badges to show locked ones too
      const allBadges = await db.query.badges.findMany({
        orderBy: asc(badges.requiredPoints), // Order by points needed to help show progression
      });

      // Enhanced badge status mapping with progress tracking
      const badgesWithStatus = allBadges.map((badge) => {
        const earned = earnedBadges.find((eb) => eb.badge.id === badge.id);
        const progress = earned
          ? 100
          : Math.min(100, Math.round((user.totalPoints / badge.requiredPoints) * 100));

        return {
          ...badge,
          earnedAt: earned?.earnedAt || null,
          progress,
          isNext: !earned && progress > 50, // Flag for next achievable badge
        };
      });

      console.log('[API] Sending achievements response with', {
        badgeCount: badgesWithStatus.length,
        recentAchievementsCount: recentAchievements.length,
      });

      res.json({
        ...user,
        accuracy: Math.round(accuracy * 100),
        recentAchievements,
        badges: badgesWithStatus,
        nextLevelProgress: {
          current: user.totalPoints % 1000,
          required: 1000,
          percentage: Math.round((user.totalPoints % 1000) / 10),
        },
      });
    } catch (error) {
      console.error('[API] Error fetching achievements:', error);
      res.status(500).json({
        message: 'Failed to fetch achievements',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[API] Failed to generate learning path:', errorMessage);
      res.status(500).json({
        message: 'Failed to generate learning path',
        error: errorMessage,
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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[API] Error fetching learning paths:', err);
      res.status(500).json({
        message: 'Failed to fetch learning paths',
        error: errorMessage,
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[API] Failed to fetch learning style questions:', errorMessage);
      res.status(500).json({ message: 'Failed to fetch questions', error: errorMessage });
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
  app.get('/api/progress/daily', requireAuth, async (req, res) => {
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
      const pastPerformance = recentQuizzes.map((quiz) => ({
        accuracy: (quiz.correctAnswers / Math.max(quiz.totalAttempts, 1)) * 100,
        date: quiz.updatedAt,
      }));

      // Calculate target performance (aim for 85% or 10% improvement)
      const currentPerformance = pastPerformance[0]?.accuracy || 0;
      const targetPerformance = Math.min(85, currentPerformance * 1.1);

      // Predict future performance using simple linear regression
      const predictedPerformance = pastPerformance.map((perf, index) => ({
        accuracy:
          currentPerformance + (index + 1) * ((targetPerformance - currentPerformance) / 10),
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
        timeSpent: 0, // TODO: Implement time tracking in future iteration
        strengthAreas: strengthAreas.map((e) => e.course.name),
        weakAreas: weakAreas.map((e) => e.course.name),
        trends: {
          pastPerformance: pastPerformance.map((p) => p.accuracy),
          predictedPerformance: predictedPerformance.map((p) => p.accuracy),
          targetPerformance,
          dates: [
            ...pastPerformance.map((p) => p.date),
            ...predictedPerformance.map((p) => p.date),
          ],
        },
        learningPath: learningPath
          ? {
              currentTopic: learningPath.courses[0]?.course.name || '',
              nextTopics: learningPath.courses.slice(1, 4).map((c) => c.course.name),
              completionRate: (learningPath.completedCourses / learningPath.totalCourses) * 100,
              estimatedTimeToTarget: Math.ceil((targetPerformance - currentPerformance) / 2), // Assuming 2% improvement per day
            }
          : null,
      };

      res.json(response);
    } catch (error) {
      console.error('[API] Error fetching daily progress:', error);
      res.status(500).json({ message: 'Failed to fetch daily progress' });
    }
  });

  app.get('/health', async (req, res) => {
    try {
      // Check database connection
      await db.execute(sql`SELECT 1`);

      // Get memory usage
      const memoryUsage = process.memoryUsage();

      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memoryUsage: {
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
        },
        environment: process.env.NODE_ENV || 'development',
      });
    } catch (error) {
      console.error('Health check failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(503).json({
        status: 'unhealthy',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Content Upload and Processing Routes
  // File upload and content analysis route
  app.post('/api/content/upload', requireAuth, async (req, res) => {
    try {
      console.log('[API] Content upload request received');

      if (!req.files || !req.files.file) {
        return res.status(400).json({
          success: false,
          message: 'No file was uploaded',
        });
      }

      const uploadedFile = req.files.file;
      if (Array.isArray(uploadedFile)) {
        return res.status(400).json({
          success: false,
          message: 'Please upload a single file',
        });
      }

      console.log('[API] Processing file:', uploadedFile.name);

      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
      ];

      console.log('[API] Uploaded file:', uploadedFile.name, 'Type:', uploadedFile.mimetype);

      if (!allowedTypes.includes(uploadedFile.mimetype)) {
        return res.status(400).json({
          success: false,
          message: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
        });
      }

      if (uploadedFile.size > 10 * 1024 * 1024) {
        // 10MB limit
        return res.status(400).json({
          success: false,
          message: 'File size exceeds 10MB limit',
        });
      }

      // Process file
      const metadata = {
        originalName: uploadedFile.name,
        uploadedBy: req.session.userId,
        timestamp: new Date().toISOString(),
        contentType: req.body.type || 'general',
        topic: req.body.topic,
        mimeType: uploadedFile.mimetype,
        size: uploadedFile.size,
      };

      // Initialize content parser with proper error handling
      try {
        const contentParser = new ContentParsingService();
        const result = await contentParser.process_upload(uploadedFile, metadata);
        console.log('[API] Content processing completed');

        res.json({
          success: true,
          analysis: result.analysis,
          message: 'Content processed successfully',
        });
      } catch (processingError) {
        console.error('[API] Content processing error:', processingError);
        res.status(500).json({
          success: false,
          message: `Failed to process content: ${processingError.message}`,
        });
      }
    } catch (error) {
      console.error('[API] Upload handler error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process uploaded content',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Code Review API Route
  app.post('/api/code-review', async (req, res) => {
    try {
      console.log('[API] Code review request received');
      const { directory } = req.body;

      if (!directory) {
        return res.status(400).json({
          success: false,
          message: 'Directory path is required',
        });
      }

      try {
        // Initialize Python code review service
        const { PythonShell } = await import('python-shell');
        const options = {
          mode: 'json',
          pythonPath: 'python3',
          pythonOptions: ['-u'], // unbuffered output
          scriptPath: './services/',
          args: [directory],
        };

        const results = await new Promise((resolve, reject) => {
          PythonShell.run('code_review_service.py', options, (err, results) => {
            if (err) {
              console.error('[API] Code review error:', err);
              reject(err);
            } else {
              console.log('[API] Code review completed successfully');
              resolve(results);
            }
          });
        });

        res.json({
          success: true,
          results: results[0], // Python script returns results as JSON
        });
      } catch (error) {
        console.error('[API] Code review handler error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to process code review',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } finally {
      console.log('[API] Code review request completed');
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}