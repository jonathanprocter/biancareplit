import { db, testConnection } from '@db';
import { sql } from 'drizzle-orm';
import type { Express } from 'express';
import { type Server, createServer } from 'http';

import { CodeReviewService } from './services/code-review';
import { submitQuizResponses } from './services/learning-style-assessment';
import { sanitizeMedicalData } from './utils/sanitize';
import { log } from './vite';

export async function registerRoutes(app: Express): Promise<Server> {
  // Test database connection before registering routes
  try {
    await testConnection();
    log('[Server] Database connection verified');
  } catch (error) {
    log('[Server] Failed to verify database connection:', error);
    throw error;
  }

  // Health check endpoint
  app.get('/api/health', async (_req, res) => {
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

  // Learning style assessment routes
  app.post('/api/learning-style/submit', async (req, res) => {
    try {
      const { responses } = req.body;

      if (!responses || !Array.isArray(responses)) {
        return res.status(400).json({ message: 'Invalid responses format' });
      }

      if (responses.length === 0) {
        return res.status(400).json({ message: 'No responses provided' });
      }

      const sanitizedResponses = responses.map(sanitizeMedicalData);
      const result = await submitQuizResponses(req.body.userId, sanitizedResponses);
      res.json(result);
    } catch (error) {
      console.error('Learning style submission error:', error);
      res.status(500).json({
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Code review endpoints
  app.post('/api/code-review', async (_req, res) => {
    try {
      const rootDir = process.cwd();
      const codeReviewService = new CodeReviewService(rootDir);
      const results = await codeReviewService.reviewCode();

      res.json({
        success: true,
        data: results,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Code review error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
