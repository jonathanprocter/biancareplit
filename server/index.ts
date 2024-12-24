import express, { NextFunction, type Request, Response } from 'express';
import { registerRoutes } from './routes';
import { log, serveStatic, setupVite } from './vite';
import { createServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';

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
    const server = createServer(app);

    // Create WebSocket server
    const wss = new WebSocketServer({ noServer: true });

    // Handle WebSocket connections
    wss.on('connection', (ws: WebSocket) => {
      ws.on('message', (message: string) => {
        // Handle WebSocket messages
        console.log('received: %s', message);
      });
    });

    // Handle upgrades while ignoring vite-hmr
    server.on('upgrade', (request, socket, head) => {
      const protocol = request.headers['sec-websocket-protocol'];

      // Ignore vite-hmr upgrade requests
      if (protocol === 'vite-hmr') {
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    });

    // Register routes
    registerRoutes(app);

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || 'Internal Server Error';
      res.status(status).json({ message });
      throw err;
    });

    // Setup vite in development mode or serve static files in production
    if (app.get('env') === 'development') {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Always serve on port 5000
    const PORT = 5000;
    server.listen(PORT, '0.0.0.0', () => {
      log(`serving on port ${PORT}`);
    });
  } catch (error) {
    log('[Server] Fatal error:', error);
    process.exit(1);
  }
})();