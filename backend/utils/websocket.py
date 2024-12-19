import asyncio
import logging
from typing import Dict, Any, Optional
import json
from datetime import datetime

class WebSocketManager:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.connections = {}
        self.session_subscriptions = {}
        
    async def initialize_session(self, user_id: str, session_id: str) -> Dict:
        """Initialize a WebSocket session for real-time updates"""
        try:
            connection_id = f"{user_id}_{session_id}_{datetime.now().timestamp()}"
            
            self.connections[connection_id] = {
                'user_id': user_id,
                'session_id': session_id,
                'connected_at': datetime.now().isoformat(),
                'last_ping': datetime.now().isoformat()
            }
            
            # Add to session subscriptions
            if session_id not in self.session_subscriptions:
                self.session_subscriptions[session_id] = set()
            self.session_subscriptions[session_id].add(connection_id)
            
            return {
                'connection_id': connection_id,
                'status': 'connected'
            }
            
        except Exception as e:
            self.logger.error(f"WebSocket initialization error: {str(e)}")
            raise
            
    async def send_update(
        self,
        session_id: str,
        update_type: str,
        data: Dict[str, Any]
    ) -> None:
        """Send real-time update to all connected clients for a session"""
        try:
            if session_id not in self.session_subscriptions:
                return
                
            message = {
                'type': update_type,
                'data': data,
                'timestamp': datetime.now().isoformat()
            }
            
            # Send to all connections subscribed to this session
            for connection_id in self.session_subscriptions[session_id]:
                if connection_id in self.connections:
                    await self._send_to_connection(connection_id, message)
                    
        except Exception as e:
            self.logger.error(f"Update broadcast error: {str(e)}")
            
    async def _send_to_connection(self, connection_id: str, message: Dict) -> None:
        """Send message to specific connection"""
        try:
            connection = self.connections.get(connection_id)
            if not connection:
                return
                
            # In a real implementation, this would use actual WebSocket send
            # For now, we'll just log it
            self.logger.info(f"Sending to {connection_id}: {json.dumps(message)}")
            
        except Exception as e:
            self.logger.error(f"Connection send error: {str(e)}")
            
    async def close_connection(self, connection_id: str) -> None:
        """Close and cleanup a WebSocket connection"""
        try:
            if connection_id not in self.connections:
                return
                
            connection = self.connections[connection_id]
            session_id = connection['session_id']
            
            # Remove from session subscriptions
            if session_id in self.session_subscriptions:
                self.session_subscriptions[session_id].discard(connection_id)
                if not self.session_subscriptions[session_id]:
                    del self.session_subscriptions[session_id]
                    
            # Remove connection
            del self.connections[connection_id]
            
        except Exception as e:
            self.logger.error(f"Connection closure error: {str(e)}")
            
    def get_active_connections(self, session_id: Optional[str] = None) -> Dict:
        """Get information about active connections"""
        try:
            if session_id:
                return {
                    conn_id: conn
                    for conn_id, conn in self.connections.items()
                    if conn['session_id'] == session_id
                }
            return dict(self.connections)
            
        except Exception as e:
            self.logger.error(f"Connection info error: {str(e)}")
            return {}
