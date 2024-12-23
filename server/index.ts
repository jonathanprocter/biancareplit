import { db, testConnection } from '@db';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import fileUpload from 'express-fileupload';
import session from 'express-session';
import { Server, createServer } from 'http';
import MemoryStore from 'memorystore';
import { AddressInfo } from 'net';
import path from 'path';
import { fileURLToPath } from 'url';

import { registerRoutes } from './routes';
import { log, serveStatic, setupVite } from './vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Global server instance for cleanup
let globalServer: Server | null = null;

// Cleanup function for graceful shutdown
async function cleanup() {
  if (globalServer) {
    try {
      const address = globalServer.address() as AddressInfo;
      if (address) {
        log(`Closing server on port ${address.port}`);
      }

      await new Promise<void>((resolve) => {
        globalServer?.close(() => {
          log('Server closed');
          resolve();
        });
      });
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
  process.exit(0);
}

// Setup cleanup handlers
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  cleanup();
});

async function startServer() {
  try {
    // Initialize Express
    const app = express();

    // Basic middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    // Initialize database first
    log('[Server] Initializing database connection...');
    try {
      await testConnection();
      log('[Server] Database connection established successfully');
    } catch (error) {
      log('[Server] Database initialization failed:', error);
      throw error;
    }

    // CORS configuration
    const corsOptions = {
      origin: process.env.NODE_ENV === 'production' ? ['https://your-production-domain.com'] : true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      maxAge: 86400,
    };
    app.use(cors(corsOptions));

    // Session store configuration
    const MemoryStoreConstructor = MemoryStore(session);
    const sessionStore = new MemoryStoreConstructor({
      checkPeriod: 86400000, // 24 hours
    });

    // Session middleware
    app.use(
      session({
        secret: process.env.SESSION_SECRET || 'development_secret',
        resave: false,
        saveUninitialized: false,
        store: sessionStore,
        cookie: {
          secure: process.env.NODE_ENV === 'production',
          maxAge: 24 * 60 * 60 * 1000,
          sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        },
      }),
    );

    // File upload middleware with proper error handling
    app.use(
      fileUpload({
        createParentPath: true,
        limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
        useTempFiles: true,
        tempFileDir: '/tmp/',
        safeFileNames: true,
        preserveExtension: true,
        abortOnLimit: true,
        debug: process.env.NODE_ENV === 'development',
      }),
    );

    // Create HTTP server
    const server = createServer(app);

    // Register routes before error handling
    const httpServer = await registerRoutes(app);
    if (!httpServer) {
      throw new Error('Failed to register routes');
    }

    // Error handling middleware
    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Error:', err);
      const status = (err as any).status || (err as any).statusCode || 500;
      const message = err.message || 'Internal Server Error';

      if (!res.headersSent) {
        res.status(status).json({
          status: 'error',
          message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Setup frontend serving
    if (app.get('env') === 'development') {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const PORT = process.env.PORT || 5000;

    // Close existing server if any
    if (globalServer) {
      await new Promise<void>((resolve) => {
        globalServer?.close(() => {
          log('Closed existing server instance');
          resolve();
        });
      });
      globalServer = null;
    }

    // Start new server with retry logic
    let retryCount = 0;
    const MAX_RETRIES = 3;

    while (retryCount < MAX_RETRIES) {
      try {
        await new Promise<void>((resolve, reject) => {
          server.listen(PORT, '0.0.0.0', () => {
            globalServer = server;
            const address = server.address();
            const actualPort = typeof address === 'object' ? address?.port : PORT;
            log(`Server started successfully on port ${actualPort}`);
            resolve();
          });

          server.once('error', (error: NodeJS.ErrnoException) => {
            if (error.code === 'EADDRINUSE') {
              log(`Port ${PORT} is in use, trying random port`);
              server.listen(0, '0.0.0.0');
            } else {
              reject(error);
            }
          });
        });
        break; // Successfully started
      } catch (error) {
        retryCount++;
        if (retryCount === MAX_RETRIES) {
          throw error;
        }
        log(`Retry attempt ${retryCount}/${MAX_RETRIES}`);
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retry
      }
    }
  } catch (error) {
    console.error('Fatal error during server startup:', error);
    await cleanup();
    process.exit(1);
  }
}

// Start the server
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
