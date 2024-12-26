import type { Express } from 'express';
import { createServer, type Server } from 'http';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function registerRoutes(app: Express): Server {
  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Serve static files in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
  }

  // API routes should be before the catch-all route
  app.use('/api/*', (_req, res) => {
    res.status(404).json({
      status: 'error',
      message: 'API endpoint not found'
    });
  });

  // SPA catch-all route - should be last
  app.get('*', (_req, res) => {
    if (process.env.NODE_ENV === 'production') {
      res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
    } else {
      // In development, Vite handles this
      res.status(404).json({
        status: 'error',
        message: 'Not found'
      });
    }
  });

  return createServer(app);
}