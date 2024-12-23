import { database as db, cleanup as dbCleanup, testConnection } from '@db';
import cors from 'cors';
import express, { NextFunction, type Request, Response } from 'express';
import session from 'express-session';
import http from 'http';
import MemoryStore from 'memorystore';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

import { registerRoutes } from './routes';
import { log, serveStatic, setupVite } from './vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
let globalServer: http.Server | null = null;

// Check if port is in use
async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = new http.Server()
      .listen(port, '0.0.0.0', () => {
        server.close(() => resolve(true));
      })
      .on('error', () => resolve(false));
  });
}

// Cleanup existing server
async function cleanupExistingServer(): Promise<void> {
  if (globalServer) {
    try {
      await new Promise<void>((resolve) => {
        globalServer?.close(() => {
          log('[Server] Existing server closed');
          resolve();
        });
      });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      globalServer = null;
    } catch (error) {
      console.error('[Server] Error closing existing server:', error);
    }
  }
}

async function startServer() {
  try {
    await cleanupExistingServer();

    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    log('[Server] Initializing database connection...');
    const isConnected = await testConnection(5);

    if (!isConnected) {
      const dbError = new Error('Database connection failed');
      if (process.env.NODE_ENV === 'production') {
        throw dbError;
      }
      log('[Server] WARNING: Starting in development mode without database');
      console.error(dbError);
    } else {
      log('[Server] Database connection verified');
    }

    app.use(
      cors({
        origin:
          process.env.NODE_ENV === 'production'
            ? process.env.CORS_ORIGIN || 'https://your-domain.com'
            : true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      }),
    );

    const sessionStore = new (MemoryStore(session))({
      checkPeriod: 86400000,
    });

    app.use(
      session({
        secret: process.env.SESSION_SECRET || 'development_secret',
        resave: false,
        saveUninitialized: false,
        store: sessionStore,
        name: 'sessionId',
        cookie: {
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true,
          maxAge: 24 * 60 * 60 * 1000,
          sameSite: 'lax',
        },
      }),
    );

    const server = await registerRoutes(app);
    if (!server) {
      throw new Error('Failed to register routes');
    }

    // Global error handler
    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      console.error('[Server] Error:', err);
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

    if (app.get('env') === 'development') {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const PORT = 5000;
    const isPortFree = await isPortAvailable(PORT);

    if (!isPortFree) {
      log(`[Server] Port ${PORT} is in use, waiting for it to be available...`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      if (!(await isPortAvailable(PORT))) {
        throw new Error(`Port ${PORT} is still in use after waiting`);
      }
    }

    server.listen(PORT, '0.0.0.0', () => {
      globalServer = server;
      log(`[Server] Started on port ${PORT}`);
      if (isConnected) {
        log('[Server] Application started successfully with database connection');
      } else {
        log('[Server] Application started in limited mode without database connection');
      }
    });

    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`[Server] Port ${PORT} is already in use`);
      } else {
        console.error('[Server] Server error:', error);
      }
    });
  } catch (error) {
    console.error('[Server] Fatal error during startup:', error);
    process.exit(1);
  }
}

async function handleShutdown(signal: string) {
  try {
    await cleanupExistingServer();
    await dbCleanup();
    log(`[Server] Gracefully shut down on ${signal}`);
    process.exit(0);
  } catch (error) {
    console.error(
      `[Server] Error during ${signal} shutdown:`,
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  }
}

// Register signal handlers once
process.once('SIGTERM', () => handleShutdown('SIGTERM'));
process.once('SIGINT', () => handleShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('[Server] Uncaught Exception:', error);
  try {
    await cleanupExistingServer();
    await dbCleanup();
    log('[Server] Closed due to uncaught exception');
  } catch (cleanupError) {
    if (cleanupError instanceof Error) {
      console.error(`Error: ${cleanupError.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', cleanupError); {
    console.error(
      '[Server] Error during cleanup after uncaught exception:',
      cleanupError instanceof Error ? cleanupError.message : cleanupError,
    );
  }
  process.exit(1);
});

startServer().catch((error) => {
  console.error('[Server] Failed to start:', error);
  process.exit(1);
});
