import { db } from '@db';
import { nclexQuestions, users } from '@db/schema';
import { eq } from 'drizzle-orm';
import type { Express, Request, Response } from 'express';
import { type Server, createServer } from 'http';

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
  app.get('/api/health/db', async (_req, res) => {
    try {
      // Simple query to verify database connection
      await db.select().from(users).limit(1);
      res.json({ status: 'connected' });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Database connection failed',
      });
    }
  });

  // Get available questions
  app.get('/api/questions', async (_req, res) => {
    try {
      const allQuestions = await db.select().from(nclexQuestions);
      res.json(allQuestions);
    } catch (error) {
      res.status(500).json({
        message: 'Failed to fetch questions',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // API route handler for 404s
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      message: `API endpoint not found: ${req.path}`,
      timestamp: new Date().toISOString(),
    });
  });

  const server = createServer(app);
  return server;
}
