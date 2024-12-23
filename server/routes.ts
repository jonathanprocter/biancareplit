import { db, testConnection } from '@db';
import { spawn } from 'child_process';
import { sql } from 'drizzle-orm';
import type { Express } from 'express';
import { type Server, createServer } from 'http';
import { join } from 'path';

import { paths } from '../config/paths';
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

  // Code review endpoint
  app.post('/api/code-review', async (req, res) => {
    try {
      const process = spawn('python3', [
        join(paths.root, 'services/code_review_service.py'),
        '--path',
        paths.root,
        '--format',
        'json',
      ]);

      let output = '';
      let error = '';

      process.stdout.on('data', (data) => {
        output += data;
      });

      process.stderr.on('data', (data) => {
        error += data;
      });

      process.on('close', (code) => {
        if (code !== 0) {
          log('[Code Review] Process exited with code:', code);
          return res.status(500).json({
            status: 'error',
            error: error || 'Code review process failed',
          });
        }

        try {
          const results = JSON.parse(output);
          res.json({
            status: 'success',
            results,
          });
        } catch (e) {
          res.status(500).json({
            status: 'error',
            error: 'Failed to parse code review results',
          });
        }
      });
    } catch (error) {
      log('[Code Review] Failed to start process:', error);
      res.status(500).json({
        status: 'error',
        error: 'Failed to start code review process',
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

  // Create HTTP server
  try {
    const httpServer = createServer(app);
    return httpServer;
  } catch (error) {
    log('[Server] Failed to create HTTP server:', error);
    throw error;
  }
}
