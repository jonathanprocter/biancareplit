import { initializeDatabase } from '@db';
import express, { NextFunction, type Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';

import { registerRoutes } from './routes';
import { log, serveStatic, setupVite } from './vite';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Simple request logging
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
      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Initialize database first
    await initializeDatabase();
    log('Database initialized successfully');

    const server = createServer(app);

    // Create WebSocket server with proper error handling
    const wss = new WebSocketServer({
      noServer: true,
      perMessageDeflate: false,
    });

    // Handle WebSocket connections with improved error handling
    wss.on('connection', (ws: WebSocket) => {
      ws.on('error', (error: Error) => {
        log(`WebSocket error: ${error.message}`);
      });

      ws.on('message', (message: Buffer) => {
        try {
          const data = message.toString();
          log(`Received WebSocket message: ${data}`);
        } catch (error) {
          log(
            `Error processing WebSocket message: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      });
    });

    // Handle upgrades with proper error handling
    server.on('upgrade', (request, socket, head) => {
      // Ignore Vite HMR upgrade requests
      if (request.headers['sec-websocket-protocol']?.includes('vite-hmr')) {
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    });

    // Register routes before setting up Vite middleware
    registerRoutes(app);

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || 'Internal Server Error';
      log(`Error: ${status} - ${message}`);
      res.status(status).json({ message });
    });

    // Setup Vite in development or serve static files in production
    if (app.get('env') === 'development') {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const PORT = process.env.PORT || 4000;
    server.listen(PORT, '0.0.0.0', () => {
      log(`Server running on port ${PORT}`);
      log(`API available at http://0.0.0.0:${PORT}/api`);
    });
  } catch (error) {
    log(`Fatal server error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
})();
