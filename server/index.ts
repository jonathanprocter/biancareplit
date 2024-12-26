import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { registerRoutes } from './routes';
import { setupVite, serveStatic } from './vite';
import { log } from './vite';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

(async () => {
  const server = registerRoutes(app);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get('env') === 'development') {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client
  const PORT = 5000;
  server.listen(PORT, '0.0.0.0', () => {
    log(`serving on port ${PORT}`);
  });
})();