import { db } from '@db';
import express, { NextFunction, type Request, Response } from 'express';
import { createServer } from 'http';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

import { registerRoutes } from './routes';
import { log, serveStatic, setupVite } from './vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
let globalServer: ReturnType<typeof createServer> | null = null;

async function cleanupServer(): Promise<void> {
  if (globalServer) {
    try {
      await new Promise<void>((resolve, reject) => {
        globalServer?.close((err) => {
          if (err) {
            log('[Server] Error closing existing server:', err);
            reject(err);
          } else {
            log('[Server] Existing server closed');
            resolve();
          }
        });
      });
      globalServer = null;
    } catch (error) {
      log('[Server] Error during cleanup:', error);
      // Still set globalServer to null to ensure we don't keep reference
      globalServer = null;
      throw error;
    }
  }
}

async function findAvailablePort(startPort: number, maxAttempts = 10): Promise<number> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const port = startPort + attempt;
    try {
      const server = createServer();
      await new Promise<void>((resolve, reject) => {
        server
          .listen(port, '0.0.0.0')
          .once('listening', () => {
            server.close(() => {
              log(`[Server] Found available port: ${port}`);
              resolve();
            });
          })
          .once('error', (err: NodeJS.ErrnoException) => {
            if (err.code === 'EADDRINUSE') {
              log(`[Server] Port ${port} is in use, trying next port...`);
              resolve(); // Continue to next port
            } else {
              reject(err);
            }
          });
      });
      return port;
    } catch (error) {
      log(`[Server] Error checking port ${startPort + attempt}:`, error);
      if (attempt === maxAttempts - 1) {
        throw new Error(`Could not find available port after ${maxAttempts} attempts`);
      }
    }
  }
  throw new Error('Port finding failed unexpectedly');
}

async function startServer() {
  try {
    await cleanupServer();

    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    // Request logging middleware
    app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        if (req.path.startsWith('/api')) {
          log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
        }
      });
      next();
    });

    // Register routes
    const server = await registerRoutes(app);
    if (!server) {
      throw new Error('Failed to create HTTP server');
    }

    // Setup Vite or static files
    if (process.env.NODE_ENV === 'development') {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Find available port
    const desiredPort = Number(process.env.PORT) || 5000;
    const port = await findAvailablePort(desiredPort);

    // Global error handler
    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      const status = (err as any).status || (err as any).statusCode || 500;
      const message = process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message;

      if (!res.headersSent) {
        res.status(status).json({
          error: message,
          timestamp: new Date().toISOString(),
        });
      }

      if (process.env.NODE_ENV !== 'production') {
        console.error('[Server Error]', err);
      }
    });

    // Start server with proper error handling and retries
    let retries = 3;
    while (retries > 0) {
      try {
        await new Promise<void>((resolve, reject) => {
          server
            .listen(port, '0.0.0.0')
            .once('listening', () => {
              globalServer = server;
              log(`[Server] Successfully started on port ${port}`);
              resolve();
            })
            .once('error', (error: NodeJS.ErrnoException) => {
              if (error.code === 'EADDRINUSE') {
                log(`[Server] Port ${port} is still in use, will retry...`);
                reject(error);
              } else {
                log('[Server] Fatal error starting server:', error);
                reject(error);
              }
            });
        });
        break; // If successful, exit retry loop
      } catch (error) {
        retries--;
        if (retries === 0) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retry
      }
    }
  } catch (error) {
    log('[Server] Fatal error during startup:', error);
    await cleanupServer();
    process.exit(1);
  }
}

// Graceful shutdown handlers
async function handleShutdown(signal: string) {
  log(`[Server] Received ${signal}, cleaning up...`);
  try {
    await cleanupServer();
    process.exit(0);
  } catch (error) {
    log('[Server] Error during shutdown:', error);
    process.exit(1);
  }
}

process.once('SIGTERM', () => handleShutdown('SIGTERM'));
process.once('SIGINT', () => handleShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  log('[Server] Uncaught Exception:', error);
  try {
    await cleanupServer();
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
