import { getDb } from '@db';
import { spawn } from 'child_process';
import { sql } from 'drizzle-orm';
import type { Express, Request, Response } from 'express';
import { type Server, createServer } from 'http';
import { join } from 'path';

import { paths } from '../config/paths';
import { log } from './vite';

export async function registerRoutes(app: Express): Promise<Server> {
  // Test database connection before registering routes
  try {
    // Verify database connection
    const db = await getDb();
    await db.execute(sql`SELECT 1`);
    log('[Server] Database connection verified');
  } catch (error) {
    log('[Server] Failed to verify database connection:', error);
    throw error;
  }

  // Code review endpoint with enhanced error handling and validation
  app.post('/api/code-review', async (req: Request, res: Response) => {
    try {
      // Input validation
      const { path = paths.root, format = 'json' } = req.body;

      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({
          status: 'error',
          error: 'OpenAI API key is not configured',
        });
      }

      // Spawn the Python code review process
      const reviewProcess = spawn(
        'python3',
        [join(paths.root, 'services/code_review_service.py'), '--path', path, '--format', format],
        {
          env: {
            ...process.env,
            PYTHONUNBUFFERED: '1',
          },
        },
      );

      let output = '';
      let error = '';

      // Collect stdout data
      reviewProcess.stdout.on('data', (data) => {
        output += data;
        log('[Code Review] Output:', data.toString());
      });

      // Collect stderr data
      reviewProcess.stderr.on('data', (data) => {
        error += data;
        log('[Code Review] Error:', data.toString());
      });

      // Handle process completion
      reviewProcess.on('close', (code) => {
        if (code !== 0) {
          log('[Code Review] Process exited with code:', code);
          return res.status(500).json({
            status: 'error',
            error: error || 'Code review process failed',
            code,
          });
        }

        try {
          const results = JSON.parse(output);
          res.json({
            status: 'success',
            timestamp: new Date().toISOString(),
            results,
          });
        } catch (e) {
          const parseError = e instanceof Error ? e.message : 'Unknown error';
          log('[Code Review] Failed to parse results:', parseError);
          res.status(500).json({
            status: 'error',
            error: 'Failed to parse code review results',
            details: parseError,
          });
        }
      });

      // Handle process errors
      reviewProcess.on('error', (err) => {
        log('[Code Review] Process error:', err);
        res.status(500).json({
          status: 'error',
          error: 'Failed to execute code review process',
          details: err.message,
        });
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log('[Code Review] Failed to start process:', errorMessage);
      res.status(500).json({
        status: 'error',
        error: 'Failed to start code review process',
        details: errorMessage,
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', async (_req, res) => {
    try {
      const db = await getDb();
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
