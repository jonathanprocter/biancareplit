import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import fileUpload from 'express-fileupload';
import session from 'express-session';
import { createServer } from 'http';
import MemoryStore from 'memorystore';
import path from 'path';
import { fileURLToPath } from 'url';

import { checkDatabaseHealth, closeDatabase } from '../db/index.js';
import { registerRoutes } from './routes.js';
import { log, serveStatic, setupVite } from './vite.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function startServer() {
  try {
    // Check database health
    const dbHealth = await checkDatabaseHealth();
    if (!dbHealth.healthy) {
      throw new Error(`Database health check failed: ${dbHealth.error}`);
    }
    log('Database connection established successfully');

    // Create HTTP server
    const server = createServer(app);

    // Register routes before setting up Vite
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

    // Port retry logic with exponential backoff
    const findAvailablePort = async (
      startPort: number = 3000,
      maxAttempts: number = 5,
    ): Promise<number> => {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const port = startPort + attempt;
        try {
          await new Promise<void>((resolve, reject) => {
            server.once('error', (err: NodeJS.ErrnoException) => {
              if (err.code === 'EADDRINUSE') {
                log(`Port ${port} is in use, trying next port...`);
                server.close();
                resolve();
              } else {
                reject(err);
              }
            });

            server.listen(port, '0.0.0.0', () => {
              server.removeAllListeners('error');
              resolve();
            });
          });
          return port;
        } catch (err) {
          if (attempt === maxAttempts - 1) throw err;
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100));
        }
      }
      throw new Error('Could not find an available port after maximum attempts');
    };

    const port = await findAvailablePort();
    log(`Server started successfully on port ${port}`);
    log(`API server running at http://0.0.0.0:${port}`);

    // Graceful shutdown
    const cleanup = async (signal: string) => {
      log(`Received ${signal}, initiating graceful shutdown...`);
      try {
        await closeDatabase();
        log('Database connections closed successfully');
        server.close(() => {
          log('HTTP server closed successfully');
          process.exit(0);
        });
      } catch (error) {
        console.error('Error during shutdown:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => void cleanup('SIGTERM'));
    process.on('SIGINT', () => void cleanup('SIGINT'));
  } catch (error) {
    console.error('Fatal error during server startup:', error);
    process.exit(1);
  }
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
