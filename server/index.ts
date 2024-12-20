import express, { type Request, Response, NextFunction } from 'express';
import { registerRoutes } from './routes';
import { setupVite, serveStatic, log } from './vite';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import session from 'express-session';
import fileUpload from 'express-fileupload';
import type { SessionOptions } from 'express-session';
import MemoryStore from 'memorystore';

// Extend express-session types
declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

// Custom error type
interface AppError extends Error {
  status?: number;
  statusCode?: number;
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

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(session(sessionConfig));

// File upload middleware
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/',
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
  abortOnLimit: true,
  debug: process.env.NODE_ENV === 'development',
}));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

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
        const responseStr = JSON.stringify(capturedJsonResponse);
        logLine += ` :: ${responseStr.length > 100 ? responseStr.slice(0, 97) + '...' : responseStr}`;
      }
      log(logLine);
    }
  });

  next();
});

// Global error handler
const errorHandler = (err: AppError, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Application error:', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ message });
};

// Main server initialization
(async () => {
  try {
    // Verify database connection
    await db.execute(sql`SELECT 1`);
    log('Database connection verified successfully');

    // Register routes and get HTTP server
    const server = registerRoutes(app);

    // Add error handler after routes
    app.use(errorHandler);

    // Setup Vite in development or serve static files in production
    if (app.get('env') === 'development') {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start the server
    const PORT = 5000;
    server.listen(PORT, '0.0.0.0', () => {
      log(`Server started on port ${PORT}`);
      log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Fatal error during server startup:', error);
    process.exit(1);
  }
})();
