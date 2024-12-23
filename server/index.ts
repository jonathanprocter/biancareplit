import { db, cleanup as dbCleanup, sql } from '@db';
import express, { NextFunction, type Request, Response } from 'express';
import http from 'http';
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

async function waitForDatabase(retries = 3, delay = 5000): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      log(`[Server] Attempting database connection (attempt ${i + 1}/${retries})...`);
      await db.execute(sql`SELECT 1`);
      log('[Server] Database connection successful');
      return;
    } catch (error) {
      if (i === retries - 1) throw error;
      log(`[Server] Database connection failed, retrying in ${delay / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
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

    // Test database connection before proceeding
    log('[Server] Testing database connection...');
    await waitForDatabase();

    // Register routes and create server
    const server = await registerRoutes(app);
    if (!server) {
      throw new Error('Failed to create HTTP server');
    }

    // Setup Vite or serve static files
    if (process.env.NODE_ENV === 'development') {
      await setupVite(app, server);
    } else {
      serveStatic(app);
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
