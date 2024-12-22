import { db } from '@db/index.js';
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
} from '@db/schema.js';
import { compare, hash } from 'bcrypt';
import { and, asc, desc, eq, gte, sql } from 'drizzle-orm';
import type { Express, NextFunction, Request, Response } from 'express';
import { type Server, createServer } from 'http';

import { AIService } from './services/AIService.js';
import { CodeReviewService } from './services/code-review.js';
import { submitQuizResponses } from './services/learning-style-assessment.js';
import { generatePersonalizedPath } from './services/recommendations.js';
import { sanitizeMedicalData } from './utils/sanitize.js';

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
    res.status(status).json(errorResponse);
  };

  // Health check endpoint
  app.get('/api/health', async (req, res) => {
    try {
      await db.execute(sql`SELECT 1`);
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(503).json({
        status: 'unhealthy',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Auth routes
  app.post('/api/register', async (req, res) => {
    try {
      const userData = extendedInsertUserSchema.parse(req.body);

      // Check if username already exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.username, userData.username),
      });

      if (existingUser) {
        return res.status(400).json({ message: 'Username already taken' });
      }

      // Hash password
      const hashedPassword = await hash(userData.password, 10);

      // Create user
      const [user] = await db
        .insert(users)
        .values({
          ...userData,
          password: hashedPassword,
          role: 'student',
        })
        .returning();

      req.session.userId = user.id;
      res.status(201).json({
        id: user.id,
        username: user.username,
        role: user.role,
      });
    } catch (error) {
      handleError(error as RequestError, res);
    }
  });

  app.post('/api/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await db.query.users.findFirst({
        where: eq(users.username, username),
      });

      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const isValidPassword = await compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      req.session.userId = user.id;
      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
      });
    } catch (error) {
      handleError(error as RequestError, res);
    }
  });

  // AI routes
  app.post('/api/ai/questions/generate', requireAuth, async (req, res) => {
    try {
      const { topic, difficulty, count } = req.body;
      const aiService = AIService.getInstance();
      const questions = await aiService.generate_questions(topic, difficulty, count);
      res.json({ success: true, questions });
    } catch (error) {
      handleError(error as RequestError, res);
    }
  });

  // Learning style assessment routes
  app.post('/api/learning-style/submit', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { responses } = req.body;

      if (!responses || !Array.isArray(responses)) {
        return res.status(400).json({ message: 'Invalid responses format' });
      }

      if (responses.length === 0) {
        return res.status(400).json({ message: 'No responses provided' });
      }

      const sanitizedResponses = responses.map(sanitizeMedicalData);
      const result = await submitQuizResponses(userId, sanitizedResponses);
      res.json(result);
    } catch (error) {
      handleError(error as RequestError, res);
    }
  });

  // Code review endpoints
  app.post('/api/code-review', async (req, res) => {
    try {
      const rootDir = process.cwd();
      const codeReviewService = new CodeReviewService(rootDir);

      console.log('[Code Review] Starting code review process...');
      const results = await codeReviewService.reviewCode();

      // Log and categorize issues for monitoring
      const issuesByType: Record<string, typeof results.issues> = {};
      for (const issue of results.issues) {
        if (!issuesByType[issue.type]) {
          issuesByType[issue.type] = [];
        }
        issuesByType[issue.type].push(issue);
      }

      const summary = {
        totalIssues: results.issues.length,
        criticalIssues: issuesByType['error']?.length || 0,
        warnings: issuesByType['warning']?.length || 0,
        suggestions: results.suggestions.length,
      };

      console.log('[Code Review] Analysis complete:', {
        summary,
        issueTypes: Object.keys(issuesByType).map((type) => ({
          type,
          count: issuesByType[type].length,
        })),
        metrics: results.metrics,
      });

      res.json({
        success: true,
        data: {
          ...results,
          summary,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[Code Review] Error during review:', error);
      const errorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(errorResponse);
    }
  });

  app.get('/api/code-review/metrics', async (req, res) => {
    try {
      const codeReviewService = new CodeReviewService(process.cwd());
      const results = await codeReviewService.reviewCode();
      res.json({
        success: true,
        metrics: results.metrics,
        suggestions: results.suggestions,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      handleError(error as RequestError, res);
    }
  });

  app.get('/api/code-review/health-compliance', async (req, res) => {
    try {
      const codeReviewService = new CodeReviewService(process.cwd());
      const results = await codeReviewService.reviewCode();

      const healthSpecificIssues = results.issues.filter(
        (issue) =>
          issue.message.toLowerCase().includes('medical') ||
          issue.message.toLowerCase().includes('health') ||
          issue.message.toLowerCase().includes('hipaa'),
      );

      res.json({
        success: true,
        healthCompliance: {
          score: results.metrics.medicalComplianceScore,
          issues: healthSpecificIssues,
          suggestions: results.suggestions.filter(
            (s) => s.toLowerCase().includes('medical') || s.toLowerCase().includes('health'),
          ),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      handleError(error as RequestError, res);
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
