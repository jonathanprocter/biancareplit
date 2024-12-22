import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import fileUpload from 'express-fileupload';
import session from 'express-session';
import { createServer } from 'http';
import MemoryStore from 'memorystore';
import path from 'path';
import { fileURLToPath } from 'url';

import { checkDatabaseHealth, closeDatabase } from '../db';
import { registerRoutes } from './routes';
import { log, serveStatic, setupVite } from './vite';

// Maximum number of database connection retries
const MAX_DB_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

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

// CORS configuration for development
app.use(
  cors({
    origin:
      process.env.NODE_ENV === 'production'
        ? 'http://localhost:5000'
        : ['http://localhost:5000', 'http://localhost:5173', 'http://0.0.0.0:5173'],
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
  let retries = 0;

  async function attemptDatabaseConnection(): Promise<boolean> {
    try {
      const dbHealth = await checkDatabaseHealth();
      if (!dbHealth.healthy) {
        throw new Error(`Database health check failed: ${dbHealth.error}`);
      }
      log('Database connection established successfully');
      return true;
    } catch (error) {
      console.error(`Database connection attempt ${retries + 1}/${MAX_DB_RETRIES} failed:`, error);
      return false;
    }
  }

  try {
    // Attempt to connect to the database with retries
    while (retries < MAX_DB_RETRIES) {
      if (await attemptDatabaseConnection()) {
        break;
      }
      retries++;
      if (retries < MAX_DB_RETRIES) {
        log(`Retrying database connection in ${RETRY_DELAY}ms...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      } else {
        throw new Error('Failed to connect to database after maximum retry attempts');
      }
    }

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

    // Start server with port retry logic
    // Port configuration is fixed to 5000 as per development guidelines
    const PORT = 5000;
    server.listen(PORT, '0.0.0.0', () => {
      log(`Server started successfully on port ${PORT}`);
      log('API and client both available at http://0.0.0.0:5000');
    });

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

startServer();
