import cors from 'cors';
import type { CorsOptions } from 'cors';
import express, { NextFunction, type Request, Response } from 'express';
import fileUpload from 'express-fileupload';
import session from 'express-session';
import type { SessionOptions } from 'express-session';
import http from 'http';
import type { Server } from 'http';
import MemoryStore from 'memorystore';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';

import { db } from '../db';
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
}

// Extend express-session types
declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

// Initialize Express app and session store
const app = express();
const MemoryStoreConstructor = MemoryStore(session);
const sessionStore = new MemoryStoreConstructor({
  checkPeriod: 86400000, // 24 hours
});

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Enhanced CORS configuration
const corsOptions: CorsOptions = {
  origin:
    process.env.NODE_ENV === 'production'
      ? process.env.FRONTEND_URL || 'http://localhost:5000'
      : ['http://localhost:5000', 'http://localhost:5173', 'http://0.0.0.0:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['set-cookie'],
};

app.use(cors(corsOptions));

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

app.use(session(sessionConfig));

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
    safeFileNames: true,
    preserveExtension: true,
  }),
);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  if (path.startsWith('/api')) {
    res.on('finish', () => {
      const duration = Date.now() - start;
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    });
  }
  next();
});

// Function to find an available port
async function findAvailablePort(desiredPort: number): Promise<number> {
  const server = net.createServer();

  try {
    await new Promise<void>((resolve, reject) => {
      server.listen(desiredPort, '0.0.0.0', () => resolve());
      server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          resolve(); // Port is in use, we'll try the next one
        } else {
          reject(err);
        }
      });
    });

    const address = server.address();
    if (address && typeof address === 'object') {
      return address.port;
    }
    return desiredPort + 1;
  } finally {
    server.close();
  }
}

// Initialize and start server
async function startServer(): Promise<void> {
  let server: Server | null = null;
  let wss: WebSocketServer | null = null;

  try {
    log('Starting server initialization...');

    // Step 1: Database health check
    const healthStatus = await checkDatabaseHealth();
    if (!healthStatus.healthy) {
      throw new Error(`Database health check failed: ${healthStatus.error}`);
    }
    log('Database health check passed');

    // Step 2: Create HTTP server
    server = http.createServer(app);

    // Step 3: Configure WebSocket server
    wss = new WebSocketServer({
      server,
      path: '/ws',
      clientTracking: true,
    });

    wss.on('connection', (ws) => {
      log('WebSocket client connected');
      ws.on('close', () => log('WebSocket client disconnected'));
    });

    // Step 4: Configure Express routes
    registerRoutes(app);

    // Step 5: Setup frontend serving
    if (app.get('env') === 'development') {
      await setupVite(app, server);
      log('Vite middleware configured for development');
    } else {
      serveStatic(app);
      log('Static file serving configured for production');
    }

    // Step 6: Start server
    const port = await findAvailablePort(5000);
    server.listen(port, '0.0.0.0', () => {
      log(`Server started successfully on port ${port}`);
    });

    // Step 7: Setup cleanup handlers
    const cleanup = async (signal: string) => {
      log(`Received ${signal} signal, initiating cleanup...`);

      try {
        if (wss) {
          wss.close();
          log('WebSocket server closed');
        }

        if (server) {
          server.close();
          log('HTTP server closed');
        }

        await closeDatabase();
        log('Database connections closed');

        process.exit(0);
      } catch (error) {
        console.error('Error during cleanup:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => cleanup('SIGTERM'));
    process.on('SIGINT', () => cleanup('SIGINT'));
  } catch (error) {
    console.error('Fatal error during server startup:', error);

    try {
      await closeDatabase();
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
    }

    process.exit(1);
  }
}

// Start the server
startServer().catch((error) => {
  console.error('Unhandled error during server startup:', error);
  process.exit(1);
});
