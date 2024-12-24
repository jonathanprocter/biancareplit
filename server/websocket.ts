import type { Server } from 'http';
import { WebSocketServer } from 'ws';

import { log } from './vite';

export function setupWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const protocol = request.headers['sec-websocket-protocol'];

    // Skip non-vite-hmr WebSocket connections
    if (protocol !== 'vite-hmr') {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws) => {
    log('WebSocket client connected');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'hmr-connection') {
          ws.send(JSON.stringify({ type: 'connected' }));
        }
      } catch (error) {
        log('WebSocket message error:', error);
      }
    });

    ws.on('error', (error) => {
      log('WebSocket error:', error);
    });

    ws.on('close', () => {
      log('WebSocket client disconnected');
    });
  });

  return wss;
}