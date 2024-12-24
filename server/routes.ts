import { db } from '@db';
import { sql } from 'drizzle-orm';
import type { Express } from 'express';
import { type Server, createServer } from 'http';

import { log } from './vite';

export async function registerRoutes(app: Express): Promise<Server> {
  // Test database connection before registering routes
  try {
    await db.execute(sql`SELECT 1`);
    log('[Database] Connection test successful');
  } catch (error) {
    log('[Database] Failed to verify connection:', error);
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
    log('[Database] Continuing in development mode without database connection');
  }

  // Register API routes
  app.get('/api/health', async (_req, res) => {
    try {
      await db.execute(sql`SELECT 1`);
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
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

  // Create HTTP server without starting it
  const server = createServer(app);
  return server;
}
