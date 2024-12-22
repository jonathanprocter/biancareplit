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

// Custom error type with enhanced properties
export interface AppError extends Error {
  status?: number;
  statusCode?: number;
  code?: string;
  details?: Record<string, unknown>;
  path?: string;
  timestamp?: string;
  requestId?: string;
}

// Extend express-session types
declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

const app = express();

// Initialize session store
const MemoryStoreConstructor = MemoryStore(session);
const sessionStore = new MemoryStoreConstructor({
  checkPeriod: 86400000, // 24 hours
});

// API prefix middleware
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

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(session(sessionConfig));

// Enhanced CORS configuration
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

  let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (path.startsWith('/api')) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine.length > 80 ? logLine.slice(0, 79) + '…' : logLine);
    }
  });

  next();
});

// Initialize and start server with proper error handling
async function startServer(): Promise<void> {
  let server: Server | null = null;
  let wss: WebSocketServer | null = null;

  try {
    log('Starting server initialization...');

    // Step 1: Database health check
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 5000;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        log(`Database health check attempt ${attempt}/${MAX_RETRIES}`);
        const healthStatus = await checkDatabaseHealth();

        if (!healthStatus.healthy) {
          throw new Error(`Database health check failed: ${healthStatus.error}`);
        }

        log('Database health check passed');
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

      ws.on('close', () => {
        clearInterval(pingInterval);
        log('WebSocket client disconnected');
      });
    });

    // Step 3: Configure Express middleware and routes
    registerRoutes(app);

    // Step 4: Setup frontend serving
    if (app.get('env') === 'development') {
      await setupVite(app, server);
      log('Vite middleware configured for development');
    } else {
      serveStatic(app);
      log('Static file serving configured for production');
    }

    // Step 5: Start server with port conflict handling
    const PORT = 5000;
    const startServer = (port: number) => {
      server.listen(port, '0.0.0.0', () => {
        log(`Server started successfully on port ${port}`);
      }).on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          log(`Port ${port} is in use, attempting to terminate existing process...`);
          const { exec } = require('child_process');
          exec(`lsof -i :${port} | grep LISTEN | awk '{print $2}' | xargs kill -9`, (err: Error) => {
            if (err) {
              log(`Failed to free port ${port}, please check manually`);
              process.exit(1);
            }
            log(`Successfully freed port ${port}, restarting server...`);
            setTimeout(() => startServer(port), 1000);
          });
        } else {
          log(`Failed to start server: ${err.message}`);
          process.exit(1);
        }
      });
    };

    startServer(PORT);

    // Setup cleanup handlers
    const cleanup = async (signal: string) => {
      log(`Received ${signal} signal, initiating cleanup...`);

      try {
        await closeDatabase();
        log('Database connections closed');

        if (wss) {
          wss.close();
          log('WebSocket server closed');
        }

        if (server) {
          server.close();
          log('HTTP server closed');
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
    console.error('Fatal error during server startup:', error);

    try {
      await closeDatabase();
    } catch (cleanupError) {
      console.error(
        'Error during final cleanup:',
        cleanupError instanceof Error ? cleanupError.message : 'Unknown error',
      );
      process.exit(1);
    }
  }
}

// Start the server with enhanced error handling
startServer().catch((error) => {
  console.error('Unhandled error during server startup:', error);
  process.exit(1);
});