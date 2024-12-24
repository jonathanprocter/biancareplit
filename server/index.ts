import express, { NextFunction, type Request, Response } from 'express';
import { createServer } from 'http';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { db } from '@db';

import { registerRoutes } from './routes';
import { log, serveStatic, setupVite } from './vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
let globalServer: ReturnType<typeof createServer> | null = null;

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

async function findAvailablePort(startPort: number, maxAttempts = 10): Promise<number> {
  for (let port = startPort; port < startPort + maxAttempts; port++) {
    try {
      const server = createServer();
      await new Promise<void>((resolve, reject) => {
        server.listen(port, '0.0.0.0')
          .once('listening', () => {
            server.close(() => resolve());
          })
          .once('error', (err: NodeJS.ErrnoException) => {
            if (err.code === 'EADDRINUSE') {
              log(`[Server] Port ${port} is in use, trying next port...`);
              resolve(); // Port is in use, try next one
            } else {
              reject(err);
            }
          });
      });
      return port;
    } catch (error) {
      log(`[Server] Error checking port ${port}:`, error);
      continue;
    }
  }
  throw new Error(`Could not find available port after ${maxAttempts} attempts`);
}

async function startServer() {
  try {
    // Clean up any existing server instance
    await cleanupServer();

    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

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

    // Find available port
    const desiredPort = Number(process.env.PORT) || 5000;
    const port = await findAvailablePort(desiredPort);

    // Error handling middleware
    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      const status = (err as any).status || (err as any).statusCode || 500;
      const message = process.env.NODE_ENV === 'production' 
        ? 'Internal Server Error' 
        : err.message;

      res.status(status).json({ error: message });
    });

    // Start server with proper error handling
    await new Promise<void>((resolve, reject) => {
      server.listen(port, '0.0.0.0')
        .once('listening', () => {
          globalServer = server;
          log(`[Server] Started on port ${port}`);
          resolve();
        })
        .once('error', (error) => {
          log('[Server] Error starting server:', error);
          reject(error);
        });
    });

  } catch (error) {
    log('[Server] Fatal error during startup:', error);
    await cleanupServer();
    process.exit(1);
  }
}

// Handle cleanup on process signals
process.once('SIGTERM', () => handleShutdown('SIGTERM'));
process.once('SIGINT', () => handleShutdown('SIGINT'));

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