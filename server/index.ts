import express, { NextFunction, type Request, Response } from 'express';
import fs from 'fs';
import { type Server } from 'http';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

import { registerRoutes } from './routes';
import { log, serveStatic, setupVite } from './vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function ensurePublicDir(): Promise<void> {
  const distPath = path.resolve(__dirname, '..', 'dist', 'public');
  try {
    await fs.promises.access(distPath);
  } catch (error) {
    await fs.promises.mkdir(distPath, { recursive: true });
    log('[Server] Created public directory:', distPath);
  }
}

async function startServer() {
  try {
    await ensurePublicDir();

    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    // Request logging middleware
    app.use((req, res, next) => {
      const start = Date.now();
      const path = req.path;
      res.on('finish', () => {
        const duration = Date.now() - start;
        if (path.startsWith('/api')) {
          log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
        }
      });
      next();
    });

    // Create and set up server with routes
    const server = registerRoutes(app);

    // Global error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || 'Internal Server Error';
      log('[Error]', err);
      res.status(status).json({ message });
    });

    // Setup Vite or serve static files
    if (app.get('env') === 'development') {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Try to start server with port fallback
    const startServerWithFallback = async (initialPort: number, maxRetries = 5): Promise<void> => {
      let currentPort = initialPort;
      let retries = 0;

      while (retries < maxRetries) {
        try {
          await new Promise<void>((resolve, reject) => {
            server.on('error', (error: NodeJS.ErrnoException) => {
              if (error.code === 'EADDRINUSE') {
                currentPort++;
                retries++;
                log(`Port ${currentPort - 1} in use, trying ${currentPort}`);
                server.close();
              } else {
                reject(error);
              }
            });

            server.listen(currentPort, '0.0.0.0', () => {
              log(`Server started on port ${currentPort}`);
              resolve();
            });
          });
          break;
        } catch (error) {
          if (retries >= maxRetries) {
            throw new Error(`Failed to start server after ${maxRetries} retries`);
          }
        }
      }
    };

    await startServerWithFallback(5000);

    // Graceful shutdown
    const cleanup = () => {
      log('Shutting down gracefully...');
      server.close(() => {
        log('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);
  } catch (error) {
    log('[Server] Fatal error during startup:', error);
    process.exit(1);
  }
}

// Start the server
startServer().catch((error) => {
  log('[Server] Failed to start:', error);
  process.exit(1);
});
