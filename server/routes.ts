import { db, testConnection } from '@db';
import { sql } from 'drizzle-orm';
import type { Express } from 'express';
import { type Server, createServer } from 'http';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

import { log } from './vite';

// ES Modules path handling
const __dirname = dirname(fileURLToPath(import.meta.url));

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

  // Create HTTP server
  try {
    const httpServer = createServer(app);
    return httpServer;
  } catch (error) {
    log('[Server] Failed to create HTTP server:', error);
    throw error;
  }
}
