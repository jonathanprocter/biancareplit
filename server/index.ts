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
  let server: Server | null = null;
  let isShuttingDown = false;

  try {
    await ensurePublicDir();

    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

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

    // Create and set up server with routes
    server = registerRoutes(app);

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

    // Try to start server on available port
    const startServerWithPort = async (port: number): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (isShuttingDown) {
          reject(new Error('Server is shutting down'));
          return;
        }

        const handleError = (error: NodeJS.ErrnoException) => {
          if (error.code === 'EADDRINUSE') {
            log(`Port ${port} in use, will try next port`);
            reject(error);
          } else {
            log(`Server error: ${error.message}`);
            reject(error);
          }
        };

        server!.listen(port, '0.0.0.0', () => {
          log(`Server started on port ${port}`);
          resolve();
        }).on('error', handleError);
      });
    };

    // Try ports in sequence starting from 8000
    const tryPorts = async (startPort: number = 8000, maxAttempts: number = 10): Promise<void> => {
      for (let port = startPort; port < startPort + maxAttempts; port++) {
        try {
          await startServerWithPort(port);
          return;
        } catch (error) {
          if (port === startPort + maxAttempts - 1) {
            throw new Error('Failed to find available port after maximum attempts');
          }
          if (isShuttingDown) {
            throw new Error('Server shutdown requested during startup');
          }
          continue;
        }
      }
    };

    // Graceful shutdown handler
    const cleanup = async () => {
      if (isShuttingDown) return;

      isShuttingDown = true;
      log('Shutting down gracefully...');

      setTimeout(() => {
        log('Forcing shutdown after timeout');
        process.exit(1);
      }, 10000);

      if (server) {
        server.close(() => {
          log('Server closed successfully');
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    };

    // Register shutdown handlers
    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);
    process.on('uncaughtException', (error) => {
      log('[Server] Uncaught exception:', error);
      cleanup();
    });

    await tryPorts();

  } catch (error) {
    log('[Server] Fatal error:', error);
    if (server && !isShuttingDown) {
      server.close();
    }
    process.exit(1);
  }
}

startServer().catch((error) => {
  log('[Server] Failed to start:', error);
  process.exit(1);
});