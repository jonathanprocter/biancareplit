import { cleanup, db, testConnection } from '@db';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import session from 'express-session';
import { Server } from 'http';
import MemoryStore from 'memorystore';
import { AddressInfo } from 'net';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

import { registerRoutes } from './routes';
import { log, serveStatic, setupVite } from './vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
let globalServer: Server | null = null;

// Check if port is in use
async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tempServer = require('http')
      .createServer()
      .listen(port, '0.0.0.0', () => {
        tempServer.close(() => resolve(true));
      })
      .on('error', () => resolve(false));
  });
}

// Cleanup existing server
async function cleanupExistingServer(): Promise<void> {
  if (globalServer) {
    try {
      const address = globalServer.address() as AddressInfo;
      await new Promise<void>((resolve) => {
        globalServer?.close(() => {
          log('[Server] Existing server closed');
          resolve();
        });
      });
      // Wait a bit for the port to be released
      await new Promise((resolve) => setTimeout(resolve, 1000));
      globalServer = null;
    } catch (error) {
      console.error('[Server] Error closing existing server:', error);
    }
  }
}

async function startServer() {
  try {
    // Clean up any existing server
    await cleanupExistingServer();
    await cleanup(); // Clean up database connections

    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    // Initialize database connection with enhanced error handling
    log('[Server] Initializing database connection...');
    const isConnected = await testConnection(5); // Increased retries for initial connection

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

    // Configure CORS with secure defaults
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

    // Configure session with enhanced security
    const sessionStore = new (MemoryStore(session))({
      checkPeriod: 86400000, // 24 hours
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
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          sameSite: 'lax',
        },
      }),
    );

    // Register routes with error handling
    const server = await registerRoutes(app);
    if (!server) {
      throw new Error('Failed to register routes');
    }

    // Global error handler with improved logging
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

    // Setup frontend based on environment
    if (app.get('env') === 'development') {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const PORT = 5000;
    const isPortFree = await isPortAvailable(PORT);

    if (!isPortFree) {
      log(`[Server] Port ${PORT} is in use, waiting for it to be available...`);
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
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

    // Handle server errors
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

// Enhanced cleanup handlers
process.on('SIGTERM', async () => {
  try {
    await cleanupExistingServer();
    await cleanup();
    log('[Server] Gracefully shut down on SIGTERM');
    process.exit(0);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    if (error instanceof Error) {
      console.error('[Server] Error during SIGTERM shutdown:', error.message);
    } else {
      console.error('[Server] Unknown error during SIGTERM shutdown:', error);
    }
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  try {
    await cleanupExistingServer();
    await cleanup();
    log('[Server] Gracefully shut down on SIGINT');
    process.exit(0);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    if (error instanceof Error) {
      console.error('[Server] Error during SIGINT shutdown:', error.message);
    } else {
      console.error('[Server] Unknown error during SIGINT shutdown:', error);
    }
    process.exit(1);
  }
});

process.on('uncaughtException', async (error) => {
  console.error('[Server] Uncaught Exception:', error);
  try {
    await cleanupExistingServer();
    await cleanup();
    log('[Server] Closed due to uncaught exception');
  } catch (cleanupError) {
    if (cleanupError instanceof Error) {
      console.error(`Error: ${cleanupError.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', cleanupError); {
    if (cleanupError instanceof Error) {
      console.error(
        '[Server] Error during cleanup after uncaught exception:',
        cleanupError.message,
      );
    } else {
      console.error(
        '[Server] Unknown error during cleanup after uncaught exception:',
        cleanupError,
      );
    }
  } finally {
    process.exit(1);
  }
});

// Start the server
startServer().catch((error) => {
  console.error('[Server] Failed to start:', error);
  process.exit(1);
});
