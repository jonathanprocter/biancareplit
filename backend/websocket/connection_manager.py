"""WebSocket connection management for the NCLEX coaching platform."""
import json
import logging
from typing import Dict
from datetime import datetime
from flask_sock import Sock
from flask import Flask

logger = logging.getLogger(__name__)

class WebSocketConnection:
    def __init__(self, ws, connected_at: datetime):
        self.ws = ws
        self.connected_at = connected_at
        self.last_ping = connected_at
        self.latency = 0.0

class WebSocketManager:
    """Manages WebSocket connections and message handling."""
    
    def __init__(self):
        """Initialize WebSocket manager."""
        self._connections: Dict[str, WebSocketConnection] = {}
        self._sock = None
        self._initialized = False
        
    def init_app(self, app: Flask) -> None:
        """Initialize WebSocket with Flask application."""
        try:
            if self._initialized:
                logger.info("WebSocket manager already initialized")
                return
                
            self._sock = Sock(app)
            
            @self._sock.route('/ws')
            def ws_handler(ws):
                try:
                    client_id = str(id(ws))
                    self._add_connection(client_id, ws)
                    ws.send(json.dumps({'type': 'connection_status', 'connected': True}))
                    while True:
                        message = ws.receive()
                        self._handle_message(client_id, message)
                except Exception as e:
                    logger.error(f"WebSocket error for client {client_id}: {str(e)}")
                finally:
                    self._remove_connection(client_id)
            
            self._initialized = True
            logger.info("WebSocket manager initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize WebSocket manager: {str(e)}")
            raise
            
    def _add_connection(self, client_id: str, ws) -> None:
        """Add new WebSocket connection."""
        if client_id not in self._connections:
            self._connections[client_id] = WebSocketConnection(
                ws=ws,
                connected_at=datetime.now()
            )
            logger.info(f"New WebSocket connection: {client_id}")
            self._broadcast_status()
            
    def _remove_connection(self, client_id: str) -> None:
        """Remove WebSocket connection."""
        if client_id in self._connections:
            del self._connections[client_id]
            logger.info(f"WebSocket connection closed: {client_id}")
            self._broadcast_status()
            
    def _handle_connection_error(self, client_id: str, error: Exception) -> None:
    """Handle connection errors with retry logic."""
    logger.error(f"WebSocket error for client {client_id}: {str(error)}")
    if client_id in self._connections:
        self._connections[client_id].reconnect_attempts += 1
        if self._connections[client_id].reconnect_attempts < 3:
            self._connections[client_id].ws.send(json.dumps({
                'type': 'reconnecting',
                'attempt': self._connections[client_id].reconnect_attempts
            }))

    def _handle_message(self, client_id: str, message: str) -> None:
        """Handle incoming WebSocket message."""
        try:
            data = json.loads(message)
            
            if data.get('type') == 'ping':
                # Handle ping message
                conn = self._connections[client_id]
                conn.last_ping = datetime.now()
                self.send_message(client_id, {
                    'type': 'pong',
                    'timestamp': datetime.now().isoformat()
                })
            elif data.get('type') == 'latency':
                # Update connection latency
                conn = self._connections[client_id]
                conn.latency = float(data.get('value', 0))
            else:
                # Echo back other messages
                self.send_message(client_id, {
                    'type': 'response',
                    'data': data
                })
            
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON message from client {client_id}")
            self.send_message(client_id, {
                'type': 'error',
                'message': 'Invalid message format'
            })
            
    def _broadcast_status(self) -> None:
        """Broadcast connection status to all clients."""
        status = {
            'type': 'connection_status',
            'connected_clients': len(self._connections),
            'timestamp': datetime.now().isoformat()
        }
        self.broadcast(status)
            
    def send_message(self, client_id: str, data: dict) -> None:
        """Send message to specific client."""
        if client_id in self._connections:
            try:
                self._connections[client_id].ws.send(json.dumps(data))
            except Exception as e:
                logger.error(f"Failed to send message to client {client_id}: {str(e)}")
                self._remove_connection(client_id)
                
    def broadcast(self, data: dict) -> None:
        """Send message to all connected clients."""
        for client_id in list(self._connections.keys()):
            self.send_message(client_id, data)

# Create singleton instance
websocket_manager = WebSocketManager()