import type { Express } from 'express';
import { type Server, createServer } from 'http';

export function registerRoutes(app: Express): Server {
  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // API route handler for 404s
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      message: `API endpoint not found: ${req.path}`,
      timestamp: new Date().toISOString(),
    });
  });

  const server = createServer(app);
  return server;
}