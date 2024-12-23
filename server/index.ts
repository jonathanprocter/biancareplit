import { cleanup as dbCleanup, getDb, testConnection } from '@db';
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
    await cleanupServer();

    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    // Enhanced CORS configuration
    const corsOptions = {
      origin: process.env.NODE_ENV === 'production'
        ? process.env.CORS_ORIGIN?.split(',') || 'https://your-domain.com'
        : ['http://localhost:5000', 'http://0.0.0.0:5000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400 // 24 hours
    };
    app.use(cors(corsOptions));

    // Enhanced session configuration
    const sessionStore = new (MemoryStore(session))({
      checkPeriod: 86400000, // 24h
      stale: false,
      ttl: 86400000,
    });

    const sessionConfig = {
      secret: process.env.SESSION_SECRET || 'development_secret',
      resave: false,
      saveUninitialized: false,
      store: sessionStore,
      name: 'sessionId',
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24h
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/',
        domain: process.env.NODE_ENV === 'production'
          ? process.env.COOKIE_DOMAIN
          : undefined
      }
    };

    if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
      throw new Error('SESSION_SECRET must be set in production');
    }

    app.use(session(sessionConfig));

    // Test database connection
    log('[Server] Testing database connection...');
    const isConnected = await testConnection(3);

    if (!isConnected && process.env.NODE_ENV === 'production') {
      throw new Error('Database connection failed in production mode');
    }

    // Register routes and create server
    const server = await registerRoutes(app);
    if (!server) {
      throw new Error('Failed to create HTTP server');
    }

    // Global error handler with enhanced security
    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      const status = (err as any).status || (err as any).statusCode || 500;
      const message = process.env.NODE_ENV === 'production'
        ? 'Internal Server Error'
        : err.message || 'Internal Server Error';

      // Log full error details in development
      if (process.env.NODE_ENV !== 'production') {
        console.error('[Server] Error:', err);
      }

      if (!res.headersSent) {
        res.status(status).json({
          error: message,
          status,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Setup Vite or serve static files
    if (process.env.NODE_ENV === 'development') {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start server
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, '0.0.0.0', () => {
      globalServer = server;
      log(`[Server] Started on port ${PORT}`);
      if (isConnected) {
        log('[Server] Application started with database connection');
      } else {
        log('[Server] Application started without database connection');
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

// Handle cleanup
async function handleShutdown(signal: string) {
  console.log(`[Server] Received ${signal}, cleaning up...`);
  try {
    await cleanupServer();
    await dbCleanup();
    process.exit(0);
  } catch (error) {
    console.error('[Server] Error during shutdown:', error);
    process.exit(1);
  }
}

// Register signal handlers
process.once('SIGTERM', () => handleShutdown('SIGTERM'));
process.once('SIGINT', () => handleShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('[Server] Uncaught Exception:', error);
  try {
    await cleanupServer();
    await dbCleanup();
  } catch (cleanupError) {
    console.error('[Server] Error during cleanup:', cleanupError);
  }
  process.exit(1);
});

// Start the server
startServer().catch((error) => {
  console.error('[Server] Failed to start:', error);
  process.exit(1);
});