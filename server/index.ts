import { db, testConnection } from '@db';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import fileUpload from 'express-fileupload';
import session from 'express-session';
import { Server } from 'http';
import MemoryStore from 'memorystore';
import { AddressInfo } from 'net';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

import { paths } from '../config/paths';
import { registerRoutes } from './routes';
import { log, serveStatic, setupVite } from './vite';

// Get server directory path for ES modules
const __dirname = dirname(fileURLToPath(import.meta.url));

// Global server instance for cleanup
let globalServer: Server | null = null;

// Cleanup function for graceful shutdown
async function cleanup() {
  if (globalServer) {
    try {
      const address = globalServer.address() as AddressInfo;
      if (address) {
        log(`Closing server on port ${address.port}`);
      }

      await new Promise<void>((resolve) => {
        globalServer?.close(() => {
          log('Server closed');
          resolve();
        });
      });
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
  process.exit(0);
}

// Setup cleanup handlers
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  cleanup();
});

async function startServer() {
  try {
    // Initialize Express
    const app = express();

    // Basic middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    // Initialize database with enhanced error handling
    log('[Server] Starting database initialization...');

    // Print connection details (without sensitive info)
    const dbUrl = new URL(process.env.DATABASE_URL || '');
    log(`[Server] Connecting to database at ${dbUrl.host}...`);

    const isConnected = await testConnection();
    if (!isConnected && process.env.NODE_ENV === 'production') {
      log('[Server] FATAL: Cannot start server without database in production mode');
      process.exit(1);
    } else if (!isConnected) {
      log('[Server] WARNING: Starting in development mode without database');
      log('[Server] Some features may be unavailable');
    } else {
      log('[Server] Database connection established successfully');
    }

    // CORS configuration
    const corsOptions = {
      origin:
        process.env.NODE_ENV === 'production'
          ? ['https://your-production-domain.com']
          : ['http://localhost:3000', 'http://localhost:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    };
    app.use(cors(corsOptions));

    // Session store configuration
    const MemoryStoreConstructor = MemoryStore(session);
    const sessionStore = new MemoryStoreConstructor({
      checkPeriod: 86400000, // 24 hours
    });

    // Session middleware
    app.use(
      session({
        secret: process.env.SESSION_SECRET || 'development_secret',
        resave: false,
        saveUninitialized: false,
        store: sessionStore,
        cookie: {
          secure: process.env.NODE_ENV === 'production',
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        },
      }),
    );

    // File upload middleware
    app.use(
      fileUpload({
        createParentPath: true,
        limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
        useTempFiles: true,
        tempFileDir: '/tmp/',
        safeFileNames: true,
        preserveExtension: true,
        abortOnLimit: true,
      }),
    );

    // Register routes
    const server = await registerRoutes(app);
    if (!server) {
      throw new Error('Failed to register routes');
    }

    // Error handling middleware
    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Error:', err);
      const status = (err as any).status || (err as any).statusCode || 500;
      const message = err.message || 'Internal Server Error';

      if (!res.headersSent) {
        res.status(status).json({
          status: 'error',
          message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Setup frontend serving
    if (app.get('env') === 'development') {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Use Vite's development port (5173) for the frontend
    const PORT = process.env.NODE_ENV === 'production' ? process.env.PORT || 5000 : 3001; // API server port

    // Start server
    server.listen(PORT, '0.0.0.0', () => {
      globalServer = server;
      const address = server.address();
      const actualPort = typeof address === 'object' ? address?.port : PORT;
      log(`Server started successfully on port ${actualPort}`);
    });
  } catch (error) {
    console.error('Fatal error during server startup:', error);
    await cleanup();
    process.exit(1);
  }
}

// Start the server
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
