import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import fileUpload from 'express-fileupload';
import session from 'express-session';
import { Server } from 'http';
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
    const dbInstance = await db();
    log('[Server] Database connection established successfully');

    // Initialize Express
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    // Session store configuration
    const MemoryStoreConstructor = MemoryStore(session);
    const sessionStore = new MemoryStoreConstructor({
      checkPeriod: 86400000, // 24 hours
    });

    // CORS configuration - Allow all origins in development
    const corsOptions = {
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://your-production-domain.com'] // Replace with actual production domain
        : true, // Allow all origins in development
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      maxAge: 86400 // CORS preflight cache time in seconds
    };
    app.use(cors(corsOptions));

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
          sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
        },
      }),
    );

    // File upload middleware
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

    // Create HTTP server
    const server = new Server(app);

    // Register routes
    registerRoutes(app);

    // Setup frontend serving
    if (process.env.NODE_ENV !== 'production') {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Error handling middleware
    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      console.error('[Server] Error:', err);
      res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    });

    // Start server
    const PORT = 5000;
    server.listen(PORT, '0.0.0.0', () => {
      log(`Server started successfully on port ${PORT}`);
    });

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
