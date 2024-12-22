import cors from 'cors';
import type { CorsOptions } from 'cors';
import express, { NextFunction, type Request, Response } from 'express';
import fileUpload from 'express-fileupload';
import session from 'express-session';
import type { SessionOptions } from 'express-session';
import http from 'http';
import type { Server } from 'http';
import MemoryStore from 'memorystore';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';

import { checkDatabaseHealth, closeDatabase } from '../db';
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

// Basic middleware setup with enhanced error handling
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(session(sessionConfig));

// Enhanced CORS configuration for development
const corsOptions: CorsOptions = {
  origin:
    process.env.NODE_ENV === 'production'
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

// Comprehensive error handling middleware
const errorHandler = (err: AppError, req: Request, res: Response, _next: NextFunction) => {
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

  console.error(`[${requestId}] Error occurred while processing request:`, {
    ...errorDetails,
    stack: err.stack,
  });

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
};

// Initialize and start server with proper error handling
async function startServer(): Promise<void> {
  let server: Server | null = null;
  let wss: WebSocketServer | null = null;

  try {
    log('Starting server initialization...');

    // Step 1: Initialize database and verify health
    log('Step 1: Database initialization and health check');
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 5000;

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
        break;
      } catch (dbError) {
        if (attempt === MAX_RETRIES) {
          throw new Error(`Database health check failed after ${MAX_RETRIES} attempts`);
        }
        log(`Retrying in ${RETRY_DELAY / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      }
    }

    // Step 2: Create HTTP server and configure WebSocket
    log('Step 2: Creating HTTP server');
    server = http.createServer(app);

    wss = new WebSocketServer({
      server,
      path: '/ws',
      clientTracking: true,
      perMessageDeflate: {
        threshold: 1024,
      },
    });

    wss.on('connection', (ws) => {
      log('WebSocket client connected');
      const pingInterval = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
          ws.ping();
        }
      }, 30000);

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

      ws.on('close', () => {
        clearInterval(pingInterval);
        log('WebSocket client disconnected');
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

    // Step 5: Start server with port conflict resolution
    const startPort = 5000;
    const maxPort = 5010;
    let PORT = startPort;
    let serverStarted = false;

    while (PORT <= maxPort && !serverStarted) {
      try {
        await new Promise<void>((resolve, reject) => {
          const testServer = http.createServer();
          testServer.once('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
              log(`Port ${PORT} is in use, trying next port...`);
              PORT++;
              resolve();
            } else {
              reject(err);
            }
          });
          testServer.once('listening', () => {
            testServer.close(() => {
              serverStarted = true;
              resolve();
            });
          });
          testServer.listen(PORT, '0.0.0.0');
        });

        if (!serverStarted) {
          continue;
        }

        await new Promise<void>((resolve, reject) => {
          if (!server) throw new Error('Server not initialized');

          server
            .listen(PORT, '0.0.0.0')
            .once('listening', () => {
              server!.keepAliveTimeout = 65000;
              server!.headersTimeout = 66000;

              log('=================================');
              log(`Server started successfully on port ${PORT}`);
              log(`Environment: ${process.env.NODE_ENV || 'development'}`);
              log(`Database: Connected`);
              log(
                `Frontend: ${app.get('env') === 'development' ? 'Vite Dev Server' : 'Static Files'}`,
              );
              log('=================================');

              resolve();
            })
            .once('error', (err) => {
              reject(new Error(`Failed to start server: ${err.message}`));
            });
        });

        break;
      } catch (error) {
        if (PORT >= maxPort) {
          throw new Error(`Could not find available port between ${startPort} and ${maxPort}`);
        }
      }
    }

    // Setup cleanup handlers
    const cleanup = async (signal: string) => {
      log(`Received ${signal} signal, initiating cleanup...`);

      try {
        await closeDatabase();
        log('Database connections closed');

        if (wss) {
          await new Promise<void>((resolve) => {
            wss!.close(() => {
              log('WebSocket server closed');
              resolve();
            });
          });
        }

        if (server) {
          await new Promise<void>((resolve) => {
            server!.close(() => {
              log('HTTP server closed');
              resolve();
            });
          });
        }

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
    console.error('Fatal error during server startup:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    try {
      await closeDatabase();
    } catch (cleanupError) {
    if (cleanupError instanceof Error) {
      console.error(`Error: ${cleanupError.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', cleanupError); {
    if (cleanupError instanceof Error) {
      console.error(`Error: ${cleanupError.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', cleanupError); {
    if (cleanupError instanceof Error) {
      console.error(`Error: ${cleanupError.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', cleanupError); {
    if (cleanupError instanceof Error) {
      console.error(`Error: ${cleanupError.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', cleanupError); {
    if (cleanupError instanceof Error) {
      console.error(`Error: ${cleanupError.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', cleanupError); {
    if (cleanupError instanceof Error) {
      console.error(`Error: ${cleanupError.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', cleanupError); {
    if (cleanupError instanceof Error) {
      console.error(`Error: ${cleanupError.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', cleanupError); {
    if (cleanupError instanceof Error) {
      console.error(`Error: ${cleanupError.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', cleanupError); {
      console.error('Error during final cleanup:', cleanupError);
    }

    process.exit(1);
  }
}

// Start the server with enhanced error handling
startServer().catch((error) => {
  console.error('Unhandled error during server startup:', error);
  process.exit(1);
});

export type { AppError };
