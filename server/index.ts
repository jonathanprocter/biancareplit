
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { db } from './config';

const app = express();
const server = createServer(app);

const PORT = parseInt(process.env.PORT || '3001');

const wss = new WebSocketServer({ 
  server,
  path: '/ws'
});

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  ws.on('message', async (message) => {
    try {
      ws.send(JSON.stringify({ status: 'received' }));
    } catch (error) {
      console.error('WebSocket error:', error);
      ws.send(JSON.stringify({ error: 'Internal server error' }));
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
