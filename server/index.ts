import express, { type Request, Response, NextFunction } from 'express';
import { registerRoutes } from './routes';
import { setupVite, serveStatic, log } from './vite';
import { db, initializeDatabase, closeDatabase } from '../db';
import type { DatabaseError } from '../db';
import { sql } from 'drizzle-orm';
import session from 'express-session';
import fileUpload from 'express-fileupload';
import type { SessionOptions } from 'express-session';
import MemoryStore from 'memorystore';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import type { CorsOptions } from 'cors'; // Added cors package import
import http from 'http'; // Added http import
import { WebSocketServer } from 'ws'; // Added ws import with correct named import

// Import types
import type { Server } from 'http';

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

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(session(sessionConfig));
const corsOptions: CorsOptions = {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  exposedHeaders: ['set-cookie'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.set('trust proxy', 1);

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
app.use(fileUpload({
  createParentPath: true,
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  },
  abortOnLimit: true,
  useTempFiles: true,
  tempFileDir: '/tmp/',
  debug: process.env.NODE_ENV === 'development',
  safeFileNames: true,
  preserveExtension: true,
}));

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
        log(`[${requestId}] Response: ${responseStr.length > 100 ? responseStr.slice(0, 97) + '...' : responseStr}`);
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
        'accept': req.headers['accept']
      }
    };

    // Log full error details for debugging
    console.error(`[${requestId}] Error occurred while processing request:`, {
      ...errorDetails,
      stack: err.stack // Always log stack trace in server logs
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
        debug: errorDetails 
      })
    };

    res.status(status).json(errorResponse);
    log(`[${requestId}] Error response sent to client with status ${status}`);
  } catch (handlerError) {
    // Fallback error handling if the error handler itself fails
    console.error('Error handler failed:', handlerError);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      timestamp: new Date().toISOString()
    });
  }
};

// Initialize and start server with proper error handling
async function startServer(): Promise<void> {
  let server: Server;
  let wss: WebSocketServer;
  
  try {
    log('Starting server initialization...');

    // Step 1: Initialize database with enhanced error handling and retries
    log('Step 1: Database initialization');
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 5000; // 5 seconds between retries
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        log(`Database connection attempt ${attempt}/${MAX_RETRIES}`);
        await initializeDatabase();
        
        // Verify connection with timeout
        const connectionTimeout = 10000; // 10 seconds
        await Promise.race([
          db.execute(sql`SELECT 1`),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout')), connectionTimeout)
          )
        ]);
        
        log('Database connection verified successfully');
        break; // Connection successful, exit retry loop
        
      } catch (dbError) {
        const errorDetails = {
          attempt,
          error: dbError instanceof Error ? dbError.message : String(dbError),
          stack: dbError instanceof Error ? dbError.stack : undefined,
          timestamp: new Date().toISOString()
        };
        
        if (attempt === MAX_RETRIES) {
          console.error('Fatal error during database initialization:', errorDetails);
          throw new Error(`Database initialization failed after ${MAX_RETRIES} attempts`);
        }
        
        console.warn(`Database connection attempt ${attempt} failed:`, errorDetails);
        log(`Retrying in ${RETRY_DELAY/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }

    // Step 2: Create HTTP server and configure WebSocket
    log('Step 2: Creating HTTP server');
    server = http.createServer(app);
    
    // Initialize WebSocket server
    wss = new WebSocketServer({ 
      server,
      path: '/ws'
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
    const PORT = 5000; // Fixed port for Replit
    await new Promise<void>((resolve, reject) => {
      server.listen(PORT, '0.0.0.0')
        .once('listening', () => {
          server.keepAliveTimeout = 65000;
          server.headersTimeout = 66000;
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
      timestamp: new Date().toISOString()
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