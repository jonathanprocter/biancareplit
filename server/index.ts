import { db, cleanup as dbCleanup, sql } from '@db';
import cors from 'cors';
import express, { NextFunction, type Request, Response } from 'express';
import session from 'express-session';
import http from 'http';
import MemoryStore from 'memorystore';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

import { registerRoutes } from './routes';
import { log, serveStatic, setupVite } from './vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
let globalServer: http.Server | null = null;

async function cleanupServer(): Promise<void> {
  if (globalServer) {
    await new Promise<void>((resolve) => {
      globalServer?.close(() => {
        log('[Server] Existing server closed');
        resolve();
      });
    });
    globalServer = null;
  }
}

async function startServer() {
  try {
    // Clean up any existing server instance
    await cleanupServer();
    await dbCleanup();

    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    // Enhanced CORS configuration
    const corsOptions = {
      origin:
        process.env.NODE_ENV === 'production'
          ? process.env.CORS_ORIGIN?.split(',') || 'https://your-domain.com'
          : ['http://localhost:5000', 'http://0.0.0.0:5000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400,
    };
    app.use(cors(corsOptions));

    // Test database connection before proceeding
    log('[Server] Testing database connection...');
    try {
      await db.execute(sql`SELECT 1`);
      log('[Server] Database connection verified');
    } catch (error) {
      log('[Server] Database connection check failed:', error);
      throw error;
    }

    // Register routes and create server
    const server = await registerRoutes(app);
    if (!server) {
      throw new Error('Failed to create HTTP server');
    }

    // Setup Vite or serve static files
    if (process.env.NODE_ENV === 'development') {
      await setupVite(app, server);
    } else {
      app.use(express.static(path.join(__dirname, '../dist/public')));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(__dirname, '../dist/public/index.html'));
      });
    }

    // Start server with proper error handling and port management
    const PORT = process.env.PORT || 5000;
    await new Promise<void>((resolve, reject) => {
      const handleError = (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          log(`[Server] Port ${PORT} is already in use, trying to close existing connections...`);
          cleanupServer()
            .then(() => {
              server
                .listen(PORT, '0.0.0.0', () => {
                  globalServer = server;
                  log(`[Server] Started on port ${PORT} after cleanup`);
                  resolve();
                })
                .on('error', reject);
            })
            .catch(reject);
        } else {
          log('[Server] Server error:', error);
          reject(error);
        }
      };

      server
        .listen(PORT, '0.0.0.0', () => {
          globalServer = server;
          log(`[Server] Started on port ${PORT}`);
          resolve();
        })
        .on('error', handleError);
    });
  } catch (error) {
    log('[Server] Fatal error during startup:', error);
    await cleanupServer();
    await dbCleanup();
    process.exit(1);
  }
}

// Handle cleanup
async function handleShutdown(signal: string) {
  log(`[Server] Received ${signal}, cleaning up...`);
  try {
    await cleanupServer();
    await dbCleanup();
    process.exit(0);
  } catch (error) {
    log('[Server] Error during shutdown:', error);
    process.exit(1);
  }
}

// Register signal handlers
process.once('SIGTERM', () => handleShutdown('SIGTERM'));
process.once('SIGINT', () => handleShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  log('[Server] Uncaught Exception:', error);
  try {
    await cleanupServer();
    await dbCleanup();
  } catch (cleanupError) {
    log('[Server] Error during cleanup:', cleanupError);
  }
  process.exit(1);
});

// Start the server
startServer().catch((error) => {
  log('[Server] Failed to start:', error);
  process.exit(1);
});
