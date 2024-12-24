import express, { NextFunction, type Request, Response } from 'express';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

import { registerRoutes } from './routes';
import { log, serveStatic, setupVite } from './vite';
import { setupWebSocketServer } from './websocket';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function ensurePublicDir(): Promise<void> {
  const distPath = path.resolve(__dirname, '..', 'dist', 'public');
  try {
    await fs.promises.access(distPath);
  } catch (error) {
    await fs.promises.mkdir(distPath, { recursive: true });
    log('[Server] Created public directory:', distPath);

    const indexPath = path.join(distPath, 'index.html');
    try {
      await fs.promises.access(indexPath);
    } catch (error) {
      const basicHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Medical Education Platform</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;
      await fs.promises.writeFile(indexPath, basicHtml, 'utf-8');
      log('[Server] Created basic index.html in public directory');
    }
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
    const server = registerRoutes(app);
    setupWebSocketServer(server);

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

    // Start the server
    const PORT = 5000;
    server.listen(PORT, '0.0.0.0', () => {
      log(`Server started on port ${PORT}`);
    });

    // Graceful shutdown handler
    process.on('SIGTERM', () => {
      log('Received SIGTERM signal');
      server.close(() => {
        log('Server closed');
        process.exit(0);
      });
    });
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
