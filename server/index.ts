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
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    // Initialize database connection
    log('[Server] Initializing database connection...');
    const isConnected = await testConnection(3);

    if (!isConnected && process.env.NODE_ENV === 'production') {
      throw new Error('Cannot start server without database in production');
    }

    if (!isConnected) {
      log('[Server] WARNING: Starting in development mode without database');
    } else {
      log('[Server] Database connection verified');
    }

    // Simple CORS setup
    app.use(cors({
      origin: true,
      credentials: true,
    }));

    // Session setup
    const sessionStore = new (MemoryStore(session))({
      checkPeriod: 86400000,
    });

    app.use(session({
      secret: process.env.SESSION_SECRET || 'development_secret',
      resave: false,
      saveUninitialized: false,
      store: sessionStore,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax',
      },
    }));

    // Register routes
    const server = await registerRoutes(app);
    if (!server) {
      throw new Error('Failed to register routes');
    }

    // Error handling
    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Error:', err);
      const status = (err as any).status || (err as any).statusCode || 500;
      const message = err.message || 'Internal Server Error';

      if (!res.headersSent) {
        res.status(status).json({ error: message, status });
      }
    });

    // Setup frontend
    if (app.get('env') === 'development') {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start server
    const PORT = parseInt(process.env.PORT || '5000', 10);
    server.listen(PORT, '0.0.0.0', () => {
      globalServer = server;
      log(`Server started on port ${PORT}`);
    });

  } catch (error) {
    console.error('Fatal error during server startup:', error);
    process.exit(1);
  }
}

// Cleanup handlers
process.on('SIGTERM', () => {
  if (globalServer) {
    globalServer.close(() => {
      log('Server closed');
      process.exit(0);
    });
  }
});

process.on('SIGINT', () => {
  if (globalServer) {
    globalServer.close(() => {
      log('Server closed');
      process.exit(0);
    });
  }
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  if (globalServer) {
    globalServer.close(() => {
      log('Server closed');
      process.exit(1);
    });
  }
});

// Start the server
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});