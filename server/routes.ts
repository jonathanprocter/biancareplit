import { db } from '@db';
import { sql } from 'drizzle-orm';
import type { Express, Request, Response } from 'express';
import { type Server, createServer } from 'http';

import { performSystemCheck } from './utils/systemCheck';
import { log } from './vite';

export async function registerRoutes(app: Express): Promise<Server> {
  // Test database connection before registering routes
  try {
    await db.execute(sql`SELECT 1`);
    log('[Server] Database connection verified');
  } catch (error) {
    log('[Server] Failed to verify database connection:', error);
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
    log('[Server] Continuing in development mode without database connection');
  }

  // System check endpoint
  app.get('/api/system-check', async (_req, res) => {
    try {
      const systemStatus = await performSystemCheck();
      res.json(systemStatus);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        status: 'error',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
    }
  });

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

  // API error handling middleware
  app.use('/api', (err: Error, _req: Request, res: Response) => {
    const status = (err as any).status || (err as any).statusCode || 500;
    const message =
      process.env.NODE_ENV === 'production'
        ? 'Internal Server Error'
        : err.message || 'Internal Server Error';

    if (!res.headersSent) {
      res.status(status).json({
        error: message,
        status,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Create HTTP server
  try {
    const httpServer = createServer(app);
    return httpServer;
  } catch (error) {
    log('[Server] Failed to create HTTP server:', error);
    throw error;
  }
}
