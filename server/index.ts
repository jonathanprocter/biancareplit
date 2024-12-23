import { db, testConnection } from '@db';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import session from 'express-session';
import { Server } from 'http';
import MemoryStore from 'memorystore';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

import { registerRoutes } from './routes';
import { log, serveStatic, setupVite } from './vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
let globalServer: Server | null = null;

async function startServer() {
  try {
    // Kill any existing server
    if (globalServer) {
      await new Promise<void>((resolve) => {
        globalServer?.close(() => {
          log('Existing server closed');
          resolve();
        });
      });
      globalServer = null;
    }

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
    server.listen(PORT, '0.0.0.0', () => {
      globalServer = server;
      log(`[Server] Started on port ${PORT}`);

      if (isConnected) {
        log('[Server] Application started successfully with database connection');
      } else {
        log('[Server] Application started in limited mode without database connection');
      }
    });
  } catch (error) {
    console.error('[Server] Fatal error during startup:', error);
    process.exit(1);
  }
}

// Enhanced cleanup handlers
process.on('SIGTERM', () => {
  if (globalServer) {
    globalServer.close(() => {
      log('[Server] Closed due to SIGTERM');
      process.exit(0);
    });
  }
});

process.on('SIGINT', () => {
  if (globalServer) {
    globalServer.close(() => {
      log('[Server] Closed due to SIGINT');
      process.exit(0);
    });
  }
});

process.on('uncaughtException', (error) => {
  console.error('[Server] Uncaught Exception:', error);
  if (globalServer) {
    globalServer.close(() => {
      log('[Server] Closed due to uncaught exception');
      process.exit(1);
    });
  }
});

// Start the server
startServer().catch((error) => {
  console.error('[Server] Failed to start:', error);
  process.exit(1);
});
