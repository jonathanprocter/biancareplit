import { db } from '@db';
import { nclexQuestions, users } from '@db/schema';
import { eq } from 'drizzle-orm';
import type { Express, Request, Response, NextFunction } from 'express';
import { type Server, createServer } from 'http';

// Error handler middleware
const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    status: 'error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

export function registerRoutes(app: Express): Server {
  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // Database health check
  app.get('/api/health/db', async (_req, res, next) => {
    try {
      await db.select().from(users).limit(1);
      res.json({ status: 'connected' });
    } catch (error) {
      next(error);
    }
  });

  // Get available questions with error handling
  app.get('/api/questions', async (_req, res, next) => {
    try {
      const allQuestions = await db.select().from(nclexQuestions);
      res.json(allQuestions);
    } catch (error) {
      next(error);
    }
  });

  // API route handler for 404s
  app.use('/api/*', (_req, res) => {
    res.status(404).json({
      status: 'error',
      message: `API endpoint not found: ${_req.path}`,
      timestamp: new Date().toISOString(),
    });
  });

  // Global error handler
  app.use(errorHandler);

  const server = createServer(app);
  return server;
}