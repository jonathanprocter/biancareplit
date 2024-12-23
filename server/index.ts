import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import fileUpload from 'express-fileupload';
import session from 'express-session';
import { Server, createServer } from 'http';
import MemoryStore from 'memorystore';
import path from 'path';
import { fileURLToPath } from 'url';

import { db } from '@db';
import { registerRoutes } from './routes';
import { log, serveStatic, setupVite } from './vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  try {
    // Initialize database first
    log('[Server] Initializing database connection...');
    const dbInstance = await db().catch((error) => {
      log('[Server] Database initialization failed: ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    });

    if (!dbInstance) {
      throw new Error('Database initialization returned null');
    }

    // Verify database connection
    await dbInstance.execute(sql`SELECT 1`).catch((error) => {
      log('[Server] Database connection test failed: ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    });

    log('[Server] Database connection established successfully');

    // Initialize Express and session store
    const app = express();
    const MemoryStoreConstructor = MemoryStore(session);
    const sessionStore = new MemoryStoreConstructor({
      checkPeriod: 86400000, // 24 hours
    });

    // Basic middleware setup
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    // CORS configuration
    app.use(
      cors({
        origin: (origin, callback) => {
          const allowedOrigins = ['http://localhost:5174', 'http://0.0.0.0:5174'];
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      }),
    );

    // Configure session middleware
    app.use(
      session({
        secret: process.env.SESSION_SECRET || 'development_secret',
        resave: false,
        saveUninitialized: false,
        store: sessionStore,
        cookie: {
          secure: process.env.NODE_ENV === 'production',
          maxAge: 24 * 60 * 60 * 1000,
        },
      }),
    );

    // File upload configuration
    app.use(
      fileUpload({
        createParentPath: true,
        limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
        useTempFiles: true,
        tempFileDir: '/tmp/',
        safeFileNames: true,
        preserveExtension: true,
      }),
    );

    // Request logging
    app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
      });
      next();
    });

    // Create HTTP server
    const server = createServer(app);

    // Register routes
    registerRoutes(app);

    // Setup frontend serving
    if (process.env.NODE_ENV !== 'production') {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Enhanced error handling middleware
    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      console.error('[Server] Error:', err);
      const statusCode = err instanceof URIError ? 400 : 500;
      res.status(statusCode).json({
        message: statusCode === 400 ? 'Bad Request' : 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    });

    // Port retry logic with proper cleanup
    const startPort = 5000;
    const maxAttempts = 5;
    
    async function tryPort(port: number, server: Server): Promise<boolean> {
      return new Promise((resolve) => {
        const onError = (err: NodeJS.ErrnoException) => {
          server.removeListener('error', onError);
          if (err.code === 'EADDRINUSE') {
            log(`Port ${port} in use, will try next port`);
            resolve(false);
          } else {
            console.error(`Unexpected server error:`, err);
            resolve(false);
          }
        };

        server.once('error', onError);
        server.listen(port, '0.0.0.0', () => {
          server.removeListener('error', onError);
          log(`Server started successfully on port ${port}`);
          log(`API server running at http://0.0.0.0:${port}`);
          resolve(true);
        });
      });
    }

    let success = false;
    let currentPort = startPort;

    while (!success && currentPort < startPort + maxAttempts) {
      success = await tryPort(currentPort, server);
      if (!success) {
        currentPort++;
        // Ensure server is not in a listening state before trying next port
        server.close();
      }
    }

    if (!success) {
      throw new Error(`Could not find an available port after ${maxAttempts} attempts`);
    }

    // Graceful shutdown
    const cleanup = async (signal: string) => {
      log(`Received ${signal}, initiating graceful shutdown...`);
      server.close(() => {
        log('HTTP server closed successfully');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => void cleanup('SIGTERM'));
    process.on('SIGINT', () => void cleanup('SIGINT'));
  } catch (error) {
    console.error('Fatal error during server startup:', error);
    process.exit(1);
  }
}

// Start the server
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
