import { db } from '@db';
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
function cleanup() {
  if (globalServer) {
    const address = globalServer.address() as AddressInfo;
    if (address) {
      log(`Closing server on port ${address.port}`);
    }

    globalServer.close(() => {
      log('Server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
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

    // Initialize database
    try {
      log('[Server] Initializing database connection...');
      const dbInstance = await db();
      if (!dbInstance) {
        throw new Error('Failed to initialize database');
      }
      log('[Server] Database connection established successfully');
    } catch (error) {
      log('[Server] Database initialization failed:', error);
      throw error;
    }

    // Session store configuration
    const MemoryStoreConstructor = MemoryStore(session);
    const sessionStore = new MemoryStoreConstructor({
      checkPeriod: 86400000, // 24 hours
    });

    // CORS configuration
    const corsOptions = {
      origin: process.env.NODE_ENV === 'production' ? ['https://your-production-domain.com'] : true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      maxAge: 86400,
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
          maxAge: 24 * 60 * 60 * 1000,
          sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        },
      }),
    );

    // File upload middleware
    app.use(
      fileUpload({
        createParentPath: true,
        limits: { fileSize: 10 * 1024 * 1024 },
        useTempFiles: true,
        tempFileDir: '/tmp/',
        safeFileNames: true,
        preserveExtension: true,
      }),
    );

    // Ensure cleanup of any existing server
    if (globalServer) {
      await new Promise<void>((resolve) => {
        globalServer?.close(() => {
          log('Closed existing server instance');
          resolve();
        });
      });
      globalServer = null;
    }

    // Create and configure HTTP server
    const server = createServer(app);
    globalServer = server;

    // Register routes
    registerRoutes(app);

    // Error handling middleware
    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || 'Internal Server Error';

      if (!res.headersSent) {
        res.status(status).json({ message });
      }
    });

    // Setup frontend serving
    if (app.get('env') === 'development') {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Ensure only one server instance
    if (globalServer) {
      await new Promise<void>((resolve) => {
        globalServer?.close(() => {
          log('Closed existing server instance');
          resolve();
        });
      });
      globalServer = null;
    }

    // Start server with proper error handling
    const PORT = process.env.PORT || 5000;
    await new Promise<void>((resolve, reject) => {
      // Close any existing server instance
      if (globalServer) {
        globalServer.close(() => {
          globalServer = null;
          startNewServer();
        });
      } else {
        startNewServer();
      }

      function startNewServer() {
        server.listen(PORT, '0.0.0.0', () => {
          globalServer = server;
          const address = server.address();
          const actualPort = typeof address === 'object' ? address?.port : PORT;
          log(`Server started successfully on port ${actualPort}`);
          resolve();
        });

        server.once('error', (error: NodeJS.ErrnoException) => {
          if (error.code === 'EADDRINUSE') {
            log(`Port ${PORT} is in use, letting OS assign an available port`);
            server.listen(0, '0.0.0.0');
          } else {
            reject(error);
          }
        });
      }
    });
  } catch (error) {
    console.error('Fatal error during server startup:', error);
    cleanup();
    process.exit(1);
  }
}

// Start the server
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
