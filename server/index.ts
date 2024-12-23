import { db } from '@db';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import fileUpload from 'express-fileupload';
import session from 'express-session';
import { Server, createServer } from 'http';
import MemoryStore from 'memorystore';
import { type NetServer, createServer as createNetServer } from 'net';
import path from 'path';
import { fileURLToPath } from 'url';

import { registerRoutes } from './routes';
import { log, serveStatic, setupVite } from './vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to find an available port
async function findAvailablePort(startPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const testServer = createNetServer();
    testServer.unref();

    testServer.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        testServer.close(() => {
          resolve(findAvailablePort(startPort + 1));
        });
      } else {
        reject(err);
      }
    });

    testServer.listen(startPort, '0.0.0.0', () => {
      testServer.close(() => resolve(startPort));
    });
  });
}

async function startServer() {
  let server: Server | null = null;

  try {
    // Initialize Express first
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    // Add request logging middleware
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
            logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
          }

          if (logLine.length > 80) {
            logLine = logLine.slice(0, 79) + '…';
          }

          log(logLine);
        }
      });

      next();
    });

    // Initialize database
    log('[Server] Initializing database connection...');
    const dbInstance = await db();
    log('[Server] Database connection established successfully');

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

    // Create HTTP server
    server = createServer(app);

    // Register API routes
    registerRoutes(app);

    // Error handling middleware
    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || 'Internal Server Error';
      res.status(status).json({ message });
    });

    // Setup frontend serving
    if (app.get('env') === 'development') {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Find available port
    const desiredPort = 5000;
    const port = await findAvailablePort(desiredPort);

    server.listen(port, '0.0.0.0', () => {
      log(`Server started successfully on port ${port}`);
    });

    // Cleanup function for graceful shutdown
    const cleanup = () => {
      if (server) {
        server.close(() => {
          log('Server closed');
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    };

    // Handle process termination
    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);
  } catch (error) {
    console.error('Fatal error during server startup:', error);
    if (server) {
      server.close(() => {
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  }
}

// Start the server
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
