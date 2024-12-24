import { sql } from 'drizzle-orm';
import type { Express } from 'express';
import { type Server, createServer } from 'http';

import { db } from '../db/index';

export function registerRoutes(app: Express): Server {
  // Health check endpoint with proper error handling
  app.get('/api/health', async (_req, res) => {
    try {
      await db.execute(sql`SELECT 1`);
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
      res.status(503).json({
        status: 'degraded',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // Global error handling middleware with proper typing
  app.use(
    (err: Error, _req: Express.Request, res: Express.Response, _next: Express.NextFunction) => {
      console.error('Error:', err);
      res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    },
  );

  return httpServer;
}
