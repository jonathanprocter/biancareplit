import type { Express } from 'express';
import { type Server, createServer } from 'http';

export function registerRoutes(app: Express): Server {
  // Health check endpoint
  app.get('/api/health', async (_req, res) => {
    try {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        status: 'error',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // API route handler
  app.use('/api/*', (req, res) => {
    res.status(404).json({ message: `API endpoint not found: ${req.path}` });
  });

  // Minimal error handling middleware (simplified from original)
  app.use((err: Error, _req, res, _next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  });


  const server = createServer(app);
  return server;
}