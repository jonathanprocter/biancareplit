
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { db } from './config';

const app = express();
const server = createServer(app);

const PORT = parseInt(process.env.PORT || '3003');

const wss = new WebSocketServer({ 
  noServer: true
});

server.on('upgrade', (request, socket, head) => {
  if (request.url === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

wss.on('connection', (ws) => {
  console.log('Client connected');
  
  ws.on('message', async (message) => {
    try {
      ws.send(JSON.stringify({ status: 'received' }));
    } catch (error) {
      console.error('WebSocket error:', error);
      ws.send(JSON.stringify({ error: 'Internal server error' }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
