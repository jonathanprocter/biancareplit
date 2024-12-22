import cors from 'cors';
import type { CorsOptions } from 'cors';
import { sql } from 'drizzle-orm';
import express, { NextFunction, type Request, Response } from 'express';
import fileUpload from 'express-fileupload';
import session from 'express-session';
import type { SessionOptions } from 'express-session';
// Added cors package import
import http from 'http';
// Added ws import with correct named import

// Import types
import type { Server } from 'http';
import MemoryStore from 'memorystore';
import path from 'path';
import { fileURLToPath } from 'url';
// Added http import
import { WebSocketServer } from 'ws';

import { checkDatabaseHealth, closeDatabase, db } from '../db';
import type { DatabaseError } from '../db';
import { registerRoutes } from './routes';
import { log, serveStatic, setupVite } from './vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Extend express-session types
declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

// Custom error type with enhanced properties
interface AppError extends Error {
  status?: number;
  statusCode?: number;
  code?: string;
  details?: Record<string, unknown>;
  path?: string;
  timestamp?: string;
  requestId?: string;
}

const app = express();

// Initialize session store
const MemoryStoreConstructor = MemoryStore(session);
const sessionStore = new MemoryStoreConstructor({
  checkPeriod: 86400000, // 24 hours
});

// API prefix middleware to ensure proper routing
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Configure session middleware
const sessionConfig: SessionOptions = {
  secret: process.env.SESSION_SECRET || 'development_secret',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax',
  },
};

// Serve static files from client/public
app.use(express.static(path.join(__dirname, '../client/public')));

// Basic middleware setup with enhanced error handling
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(session(sessionConfig));

// Enhanced CORS configuration for development
const corsOptions: CorsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL || 'http://localhost:5000'
    : ['http://localhost:5000', 'http://localhost:5173', 'http://0.0.0.0:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  exposedHeaders: ['set-cookie'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.set('trust proxy', 1);

// Add error handling for JSON parsing
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  next(err);
});

// Ensure API routes don't interfere with Vite in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api')) {
      // Skip API middleware for non-API routes to prevent interference with Vite
      return next();
    }
    return next();
  });
}

// File upload middleware
app.use(
  fileUpload({
    createParentPath: true,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max file size
    },
    abortOnLimit: true,
    useTempFiles: true,
    tempFileDir: '/tmp/',
    debug: process.env.NODE_ENV === 'development',
    safeFileNames: true,
    preserveExtension: true,
  }),
);

// Enhanced request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  const requestId = Math.random().toString(36).substring(7);

  log(`[${requestId}] Incoming ${req.method} ${path}`);
  if (Object.keys(req.query).length > 0) {
    log(`[${requestId}] Query params: ${JSON.stringify(req.query)}`);
  }
  if (req.body && Object.keys(req.body).length > 0) {
    log(`[${requestId}] Request body: ${JSON.stringify(req.body)}`);
  }

  let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLine = `[${requestId}] ${req.method} ${path} ${res.statusCode} in ${duration}ms`;

    if (res.statusCode >= 400) {
      console.error(`${logLine} - Error occurred`);
      if (capturedJsonResponse) {
        console.error(`[${requestId}] Error details:`, capturedJsonResponse);
      }
    } else {
      log(logLine);
      if (path.startsWith('/api') && capturedJsonResponse) {
        const responseStr = JSON.stringify(capturedJsonResponse);
        log(
          `[${requestId}] Response: ${responseStr.length > 100 ? responseStr.slice(0, 97) + '...' : responseStr}`,
        );
      }
    }
  });

  next();
});

// Comprehensive error handling middleware with better type safety and formatting
const errorHandler = (err: AppError, req: Request, res: Response, _next: NextFunction) => {
  try {
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    const requestId = Math.random().toString(36).substring(7);
    const timestamp = new Date().toISOString();

    // Detailed error logging with safe error extraction
    const errorDetails = {
      requestId,
      method: req.method,
      path: req.path,
      status,
      message,
      timestamp,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      body: req.body && Object.keys(req.body).length > 0 ? req.body : undefined,
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
        accept: req.headers['accept'],
      },
    };

    // Log full error details for debugging
    console.error(`[${requestId}] Error occurred while processing request:`, {
      ...errorDetails,
      stack: err.stack, // Always log stack trace in server logs
    });

    // Client response with appropriate level of detail
    const errorResponse = {
      success: false,
      message,
      status,
      code: err.code || 'INTERNAL_ERROR',
      requestId,
      path: req.path,
      timestamp,
      details: err.details,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        debug: errorDetails,
      }),
    };

    res.status(status).json(errorResponse);
    log(`[${requestId}] Error response sent to client with status ${status}`);
  } catch (handlerError) {
    // Fallback error handling if the error handler itself fails
    console.error('Error handler failed:', handlerError);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      timestamp: new Date().toISOString(),
    });
  }
};

// Initialize and start server with proper error handling
async function startServer(): Promise<void> {
  let server: Server;
  let wss: WebSocketServer;

  try {
    log('Starting server initialization...');

    // Step 1: Initialize database and verify health
    log('Step 1: Database initialization and health check');
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 5000; // 5 seconds between retries

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        log(`Database health check attempt ${attempt}/${MAX_RETRIES}`);

        const healthStatus = await checkDatabaseHealth();
        if (!healthStatus.healthy) {
          throw new Error(`Database health check failed: ${healthStatus.error}`);
        }

        log('Database health check passed:', {
          database: healthStatus.database,
          version: healthStatus.version,
          tableCount: healthStatus.tableCount,
          connectionCount: healthStatus.connectionCount,
        });

        break; // Health check successful, exit retry loop
      } catch (dbError) {
        const errorDetails = {
          attempt,
          error: dbError instanceof Error ? dbError.message : String(dbError),
          stack: dbError instanceof Error ? dbError.stack : undefined,
          timestamp: new Date().toISOString(),
        };

        if (attempt === MAX_RETRIES) {
          console.error('Fatal error during database health check:', errorDetails);
          throw new Error(`Database health check failed after ${MAX_RETRIES} attempts`);
        }

        console.warn(`Database health check attempt ${attempt} failed:`, errorDetails);
        log(`Retrying in ${RETRY_DELAY / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      }
    }

    // Step 2: Create HTTP server and configure WebSocket
    log('Step 2: Creating HTTP server');
    server = http.createServer(app);

    // Initialize WebSocket server with proper host configuration
    wss = new WebSocketServer({
      server,
      path: '/ws',
      host: '0.0.0.0',
    });

    wss.on('connection', (ws) => {
      log('WebSocket client connected');
      ws.on('message', (message) => {
        log('WebSocket message received: %s', message);
      });
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });

    // Step 3: Configure Express middleware and routes
    log('Step 3: Configuring express middleware and routes');
    registerRoutes(app);
    app.use(errorHandler);
    log('API routes and error handling configured');

    // Step 4: Setup frontend serving
    log('Step 4: Configuring frontend serving');
    if (app.get('env') === 'development') {
      await setupVite(app, server);
      log('Vite middleware configured for development');
    } else {
      serveStatic(app);
      log('Static file serving configured for production');
    }

    // Step 5: Start server
    // ALWAYS serve the app on port 5000
    // this serves both the API and the client
    const PORT = 5000;
    try {
      // Check if port is in use
      await new Promise((resolve, reject) => {
        const testServer = http.createServer();
        testServer.once('error', (err: any) => {
          if (err.code === 'EADDRINUSE') {
            reject(new Error(`Port ${PORT} is already in use`));
          } else {
            reject(err);
          }
        });
        testServer.once('listening', () => {
          testServer.close(resolve);
        });
        testServer.listen(PORT, '0.0.0.0');
      });

      // Start the actual server
      await new Promise<void>((resolve, reject) => {
        server
          .listen(PORT, '0.0.0.0')
          .once('listening', () => {
            if (server) {
              server.keepAliveTimeout = 65000;
              server.headersTimeout = 66000;
            }
            log('=================================');
            log(`Server started successfully on port ${PORT}`);
            log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            log(`Database: Connected`);
            log(`Frontend: ${app.get('env') === 'development' ? 'Vite Dev Server' : 'Static Files'}`);
            log('=================================');
            resolve();
          })
          .once('error', (err) => {
            reject(new Error(`Failed to start server: ${err.message}`));
          });
      });
    } catch (error) {
      log(`Failed to start server: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Attempt to close any existing connections before exiting
      try {
        await closeDatabase();
        log('Database connections closed');
      } catch (cleanupError) {
        log(`Error closing database: ${cleanupError instanceof Error ? cleanupError.message : 'Unknown error'}`);
      }
      process.exit(1);
    }

    // Setup cleanup handlers
    const cleanup = async (signal: string) => {
      log(`Received ${signal} signal, initiating cleanup...`);
      try {
        // Close database connections first
        await closeDatabase();
        log('Database connections closed');

        // Close WebSocket server
        await new Promise<void>((resolve) => {
          wss.close(() => {
            log('WebSocket server closed');
            resolve();
          });
        });

        // Finally close HTTP server
        await new Promise<void>((resolve) => {
          server.close(() => {
            log('HTTP server closed');
            resolve();
          });
        });

        log('Cleanup completed successfully');
        process.exit(0);
      } catch (error) {
        console.error('Error during cleanup:', error);
        process.exit(1);
      }
    };

    // Register cleanup handlers
    process.on('SIGTERM', () => cleanup('SIGTERM'));
    process.on('SIGINT', () => cleanup('SIGINT'));
  } catch (error) {
    const errorDetails = {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    };
    console.error('Fatal error during server startup:', errorDetails);

    // Attempt cleanup before exiting
    try {
      await closeDatabase();
    } catch (cleanupError) {
      console.error('Error during cleanup after startup failure:', cleanupError);
    }

    process.exit(1);
  }
}

// Start the server
startServer().catch((error) => {
  console.error('Unhandled error during server startup:', error);
  process.exit(1);
});